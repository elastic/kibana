/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as bh from 'blurhash';
import type { FileImageMetadata } from '@kbn/shared-ux-file-types';

export function isImage(file: { type?: string }): boolean {
  return Boolean(file.type?.startsWith('image/'));
}

export const boxDimensions = {
  width: 120,
  height: 120,
};

/**
 * Calculate the size of an image, fitting to our limits see {@link boxDimensions},
 * while preserving the aspect ratio.
 */
export function fitToBox(width: number, height: number): { width: number; height: number } {
  const offsetRatio = Math.abs(
    Math.min(
      // Find the aspect at which our box is smallest, if less than 1, it means we exceed the limits
      Math.min(boxDimensions.width / width, boxDimensions.height / height),
      // Values greater than 1 are within our limits
      1
    ) - 1 // Get the percentage we are exceeding. E.g., 0.3 - 1 = -0.7 means the image needs to shrink by 70% to fit
  );
  return {
    width: Math.floor(width - offsetRatio * width),
    height: Math.floor(height - offsetRatio * height),
  };
}

/**
 * Get the native size of the image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const image = new window.Image();
    image.src = src;
    image.onload = () => res(image);
    image.onerror = rej;
  });
}

/**
 * Extract image metadata, assumes that file or blob as an image!
 */
export async function getImageMetadata(file: File | Blob): Promise<undefined | FileImageMetadata> {
  const imgUrl = window.URL.createObjectURL(file);
  try {
    const image = await loadImage(imgUrl);
    const canvas = document.createElement('canvas');
    // blurhash encoding and decoding is an expensive algorithm,
    // so we have to shrink the image to speed up the calculation
    const { width, height } = fitToBox(image.width, image.height);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d canvas context!');
    ctx.drawImage(image, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    return {
      blurhash: bh.encode(imgData.data, imgData.width, imgData.height, 4, 4),
      width: image.width,
      height: image.height,
    };
  } catch (e) {
    // Don't error out if we cannot generate the blurhash
    return undefined;
  } finally {
    window.URL.revokeObjectURL(imgUrl);
  }
}

export type ImageMetadataFactory = typeof getImageMetadata;

export function getBlurhashSrc({
  width,
  height,
  hash,
}: {
  width: number;
  height: number;
  hash: string;
}): string {
  const smallSizeImageCanvas = document.createElement('canvas');
  const { width: blurWidth, height: blurHeight } = fitToBox(width, height);
  smallSizeImageCanvas.width = blurWidth;
  smallSizeImageCanvas.height = blurHeight;

  const smallSizeImageCtx = smallSizeImageCanvas.getContext('2d')!;
  const imageData = smallSizeImageCtx.createImageData(blurWidth, blurHeight);
  imageData.data.set(bh.decode(hash, blurWidth, blurHeight));
  smallSizeImageCtx.putImageData(imageData, 0, 0);

  // scale back the blurred image to the size of the original image,
  // so it is sized and positioned the same as the original image when used with an `<img>` tag
  const originalSizeImageCanvas = document.createElement('canvas');
  originalSizeImageCanvas.width = width;
  originalSizeImageCanvas.height = height;
  const originalSizeImageCtx = originalSizeImageCanvas.getContext('2d')!;
  originalSizeImageCtx.drawImage(smallSizeImageCanvas, 0, 0, width, height);
  return originalSizeImageCanvas.toDataURL();
}
