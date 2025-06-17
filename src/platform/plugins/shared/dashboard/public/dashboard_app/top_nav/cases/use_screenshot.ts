/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import html2canvas from 'html2canvas';

export function useScreenshot() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const generateScreenshot = useCallback(async () => {
    const element = document.getElementById('kibana-body');
    if (!element) {
      return null;
    }

    const originalScrollTop = element.scrollTop;
    element.scrollTop = 0;

    try {
      const canvas = await html2canvas(element, {
        scrollY: -window.scrollY,
        scale: 0.9,
      });

      element.scrollTop = originalScrollTop;

      const splitCanvases = splitCanvasVertically(canvas);
      const base64Chunks = splitCanvases.map((chunk) => chunk.toDataURL('image/jpeg', 0.6));

      setScreenshot(base64Chunks);
    } catch (error) {
      setScreenshot(null);
    }
  }, [setScreenshot]);

  return {
    generateScreenshot,
    screenshot,
  };
}

function splitCanvasVertically(
  canvas: HTMLCanvasElement,
  maxChunkHeight = 2000
): HTMLCanvasElement[] {
  const parts: HTMLCanvasElement[] = [];
  const width = canvas.width;
  const height = canvas.height;

  const partsCount = Math.ceil(height / maxChunkHeight);

  for (let i = 0; i < partsCount; i++) {
    const chunkHeight = i === partsCount - 1 ? height - i * maxChunkHeight : maxChunkHeight;

    const chunkCanvas = document.createElement('canvas');
    chunkCanvas.width = width;
    chunkCanvas.height = chunkHeight;

    const ctx = chunkCanvas.getContext('2d');
    if (!ctx) continue;

    ctx.drawImage(canvas, 0, i * maxChunkHeight, width, chunkHeight, 0, 0, width, chunkHeight);

    parts.push(chunkCanvas);
  }

  return parts;
}
