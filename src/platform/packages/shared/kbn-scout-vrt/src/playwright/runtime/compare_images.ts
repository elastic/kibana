/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const PIXELMATCH_THRESHOLD = 0.1;

interface NormalizedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

export interface CompareImagesResult {
  dimensionMismatch: boolean;
  mismatchRatio: number;
}

const normalizeImageBuffer = async (
  imageBuffer: Buffer,
  width?: number,
  height?: number
): Promise<NormalizedImage> => {
  const instance = sharp(imageBuffer);
  const metadata = await instance.metadata();
  const normalizedWidth = width ?? metadata.width ?? 0;
  const normalizedHeight = height ?? metadata.height ?? 0;

  if (normalizedWidth === 0 || normalizedHeight === 0) {
    throw new Error('Unable to determine PNG dimensions for visual regression comparison');
  }

  const buffer = await instance
    .resize(normalizedWidth, normalizedHeight, { fit: 'fill' })
    .png()
    .toBuffer();

  return {
    buffer,
    width: normalizedWidth,
    height: normalizedHeight,
  };
};

export const compareImages = async ({
  actualBuffer,
  baselineBuffer,
  diffPath,
}: {
  actualBuffer: Buffer;
  baselineBuffer: Buffer;
  diffPath?: string;
}): Promise<CompareImagesResult> => {
  const actualMetadata = await sharp(actualBuffer).metadata();
  const baselineMetadata = await sharp(baselineBuffer).metadata();
  const actualWidth = actualMetadata.width ?? 0;
  const actualHeight = actualMetadata.height ?? 0;
  const baselineWidth = baselineMetadata.width ?? 0;
  const baselineHeight = baselineMetadata.height ?? 0;
  const dimensionMismatch = actualWidth !== baselineWidth || actualHeight !== baselineHeight;
  const compareWidth = Math.min(actualWidth, baselineWidth);
  const compareHeight = Math.min(actualHeight, baselineHeight);

  if (compareWidth === 0 || compareHeight === 0) {
    throw new Error('Unable to compare visual regression images with zero-sized dimensions');
  }

  const normalizedActual = await normalizeImageBuffer(actualBuffer, compareWidth, compareHeight);
  const normalizedBaseline = await normalizeImageBuffer(
    baselineBuffer,
    compareWidth,
    compareHeight
  );
  const actualPng = PNG.sync.read(normalizedActual.buffer);
  const baselinePng = PNG.sync.read(normalizedBaseline.buffer);
  const diffPng = new PNG({ width: compareWidth, height: compareHeight });
  const mismatchedPixels = pixelmatch(
    actualPng.data,
    baselinePng.data,
    diffPng.data,
    compareWidth,
    compareHeight,
    {
      threshold: PIXELMATCH_THRESHOLD,
    }
  );
  const mismatchRatio = mismatchedPixels / (compareWidth * compareHeight);

  if (diffPath && (dimensionMismatch || mismatchRatio > 0)) {
    await fs.mkdir(path.dirname(diffPath), { recursive: true });
    await fs.writeFile(diffPath, PNG.sync.write(diffPng));
  }

  return {
    dimensionMismatch,
    mismatchRatio,
  };
};
