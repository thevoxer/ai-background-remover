/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Image as ImageIcon, Trash2, Download, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeBackground = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: 'Remove the background from this image. Keep only the main subject. Return the result as an image with a clean, transparent-looking white background.',
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResult(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('AI did not return an image. Please try again.');
      }
    } catch (err: any) {
      console.error('Error removing background:', err);
      setError(err.message || 'Failed to process image. Please check your API key or try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'background-removed.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 max-w-2xl"
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Background <span className="text-brand-500 italic">Remover</span>
        </h1>
        <p className="text-brand-600 text-lg">
          Upload any photo and let our AI handle the tedious masking work for you in seconds.
        </p>
      </motion.div>

      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Upload Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-500">Original Image</h2>
            {image && (
              <button 
                onClick={reset}
                className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={14} /> Reset
              </button>
            )}
          </div>

          {!image ? (
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-3xl border-2 border-dashed border-brand-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
                <Upload className="text-brand-600" size={28} />
              </div>
              <p className="font-medium text-brand-800">Click or drag to upload</p>
              <p className="text-sm text-brand-500 mt-1">PNG, JPG or WEBP</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </motion.div>
          ) : (
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-brand-200 shadow-sm">
              <img 
                src={image} 
                alt="Original" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              {!result && !isProcessing && (
                <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-brand-900 px-4 py-2 rounded-lg font-medium shadow-lg flex items-center gap-2"
                  >
                    <ImageIcon size={18} /> Change Image
                  </button>
                </div>
              )}
            </div>
          )}

          {image && !result && (
            <button
              onClick={removeBackground}
              disabled={isProcessing}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Remove Background
                </>
              )}
            </button>
          )}
        </section>

        {/* Result Section */}
        <section className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-500">Result</h2>
          
          <div className="aspect-square rounded-3xl border-2 border-brand-100 bg-brand-100/50 flex flex-col items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center p-8"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 border-4 border-brand-200 border-t-brand-900 rounded-full animate-spin" />
                    <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-900" size={24} />
                  </div>
                  <p className="font-medium text-brand-800">Removing background...</p>
                  <p className="text-sm text-brand-500 mt-2">Our AI is analyzing your image and isolating the subject.</p>
                </motion.div>
              ) : result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full h-full p-4"
                >
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center">
                    <img 
                      src={result} 
                      alt="Result" 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-center p-8 text-red-500"
                >
                  <AlertCircle size={48} className="mb-4" />
                  <p className="font-semibold">Something went wrong</p>
                  <p className="text-sm mt-2 max-w-xs">{error}</p>
                  <button 
                    onClick={removeBackground}
                    className="mt-6 text-sm font-medium underline underline-offset-4"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : (
                <div className="text-center p-8 text-brand-400">
                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Your processed image will appear here</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {result && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={downloadResult}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download
              </button>
              <button
                onClick={reset}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                Start Over
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-20 text-center text-brand-400 text-sm">
        <p>© 2026 AI Background Remover. Powered by Gemini 2.5 Flash Image.</p>
      </footer>
    </div>
  );
}
