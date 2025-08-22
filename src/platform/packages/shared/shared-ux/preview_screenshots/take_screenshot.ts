/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import html2canvas from 'html2canvas';

import { DEFAULT_CONTAINER_SELECTOR, getPreviewDimensions, storePreviewScreenshot } from './lib';
import type { TakePreviewScreenshotOptions, CapturePreviewScreenshotOptions } from './types';

/**
 * Captures a screenshot of a preview container and returns the image data.
 *
 * Returns the base64-encoded data URL of the screenshot, or null if the screenshot failed.
 */
export const capturePreviewScreenshot = async ({
  target,
  querySelector = DEFAULT_CONTAINER_SELECTOR,
  scrollX = 0,
  scrollY = 0,
  maxHeight,
  maxWidth,
  aspectRatio,
}: CapturePreviewScreenshotOptions): Promise<string | null> => {
  const container = target || document.querySelector(querySelector);

  if (!container || !(container instanceof HTMLElement)) {
    return null;
  }

  try {
    const capture = await html2canvas(container, {
      scale: window.devicePixelRatio,
      scrollX,
      scrollY,
      width: container.scrollWidth,
      height: container.scrollHeight,
      allowTaint: true,
    });

    let dataUrl = capture.toDataURL('image/png');

    const { drawImageParams, height, width } = getPreviewDimensions({
      capture,
      maxWidth,
      maxHeight,
      aspectRatio,
    });

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = Math.round(width);
    resizedCanvas.height = Math.round(height);

    const ctx = resizedCanvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;

    if (!ctx) {
      /* eslint-disable-next-line no-console */
      console.error('Failed to create 2d context for preview screenshot');
      return null;
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(capture, ...drawImageParams);
    dataUrl = resizedCanvas.toDataURL('image/png');

    return dataUrl;
  } catch (e) {
    /* eslint-disable-next-line no-console */
    console.error('Failed to capture preview screenshot', e);
  }

  return null;
};

/**
 * Takes a screenshot of a preview container and stores it using the provided storage function.
 *
 * Returns `true` if the screenshot was successfully taken and stored, false otherwise.
 */
export const takePreviewScreenshot = async ({
  savedObjectId,
  target,
  querySelector = DEFAULT_CONTAINER_SELECTOR,
  scrollX = 0,
  scrollY = 0,
  storeScreenshot = storePreviewScreenshot,
  maxHeight,
  maxWidth,
  aspectRatio,
}: TakePreviewScreenshotOptions): Promise<boolean> => {
  const dataUrl = await capturePreviewScreenshot({
    target,
    querySelector,
    scrollX,
    scrollY,
    maxHeight,
    maxWidth,
    aspectRatio,
  });

  if (!dataUrl) {
    return false;
  }

  return storeScreenshot({
    savedObjectId,
    dataUrl,
  });
};
