/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PNG } from 'pngjs';

/**
 * Stretches a PNG to `width` x `height` with bilinear interpolation
 */
export const resizePng = (src: PNG, width: number, height: number): PNG => {
  const dst = new PNG({ width, height });
  const scaleX = src.width / width;
  const scaleY = src.height / height;
  for (let y = 0; y < height; y++) {
    const srcY = Math.min(Math.max((y + 0.5) * scaleY - 0.5, 0), src.height - 1);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, src.height - 1);
    const weightY = srcY - y0;
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(Math.max((x + 0.5) * scaleX - 0.5, 0), src.width - 1);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const weightX = srcX - x0;
      const topLeft = (y0 * src.width + x0) * 4;
      const topRight = (y0 * src.width + x1) * 4;
      const bottomLeft = (y1 * src.width + x0) * 4;
      const bottomRight = (y1 * src.width + x1) * 4;
      const out = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top =
          src.data[topLeft + channel] * (1 - weightX) + src.data[topRight + channel] * weightX;
        const bottom =
          src.data[bottomLeft + channel] * (1 - weightX) +
          src.data[bottomRight + channel] * weightX;
        dst.data[out + channel] = Math.round(top * (1 - weightY) + bottom * weightY);
      }
    }
  }
  return dst;
};
