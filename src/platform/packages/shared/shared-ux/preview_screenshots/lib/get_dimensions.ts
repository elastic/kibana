/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DEFAULT_ASPECT_RATIO = 0.75;
const DEFAULT_MAX_WIDTH = 400;

/**
 * Parameters for the `getPreviewDimensions` function.
 */
export interface GetPreviewDimensionsParams {
  /** The `canvas` element to target. */
  capture: HTMLCanvasElement;
  /** The maximum `width` for the preview image. Defaults to `400`. */
  maxWidth?: number;
  /** The maximum `height` for the preview image. Defaults to `Infinity`. */
  maxHeight?: number;
  /** The desired aspect ratio for the preview image. Defaults to `0.75`. */
  aspectRatio?: number;
}

/**
 * Result type for the `getPreviewDimensions` function.
 */
export interface GetPreviewDimensionsResult {
  /** The calculated `width` for the preview image. */
  width: number;
  /** The calculated `height` for the preview image. */
  height: number;
  /** Parameters for the `drawImage` function. */
  drawImageParams: Readonly<[number, number, number, number, number, number, number, number]>;
}

/**
 * Utility function to calculate dimensions for a preview screenshot.
 *
 * This function takes an `HTMLCanvasElement` and optional parameters for maximum width,
 * maximum height, and aspect ratio. It calculates the dimensions of the preview image
 * while preserving the aspect ratio and ensuring it fits within the specified bounds.
 *
 * It returns an object containing the appropriate height and width of the preview screenshot,
 * as well as parameters for the `drawImage` function to draw the altered image onto a new canvas.
 */
export const getPreviewDimensions = ({
  capture,
  maxWidth,
  maxHeight,
  aspectRatio = DEFAULT_ASPECT_RATIO,
}: GetPreviewDimensionsParams): GetPreviewDimensionsResult => {
  const { width: captureWidth, height: captureHeight } = capture;

  let sourceX = 0;
  const sourceY = 0;
  let sourceWidth = captureWidth;
  let sourceHeight = captureHeight;

  const capturedAspectRatio = captureHeight / captureWidth;

  if (capturedAspectRatio > aspectRatio) {
    // The capture is taller, crop the height, (aligning at the top).
    sourceHeight = captureWidth * aspectRatio;
  } else if (capturedAspectRatio < aspectRatio) {
    // The capture is wider, crop the width and center horizontally.
    sourceWidth = captureHeight / aspectRatio;
    sourceX = (captureWidth - sourceWidth) / 2;
  }

  // Ensure the cropping logic is applied correctly.
  sourceHeight = Math.min(sourceHeight, captureHeight);
  sourceWidth = Math.min(sourceWidth, captureWidth);

  // Fit within maxWidth and maxHeight, honoring aspectRatio.
  const boundWidth = maxWidth ?? (maxHeight ? Infinity : DEFAULT_MAX_WIDTH);
  const boundHeight = maxHeight ?? Infinity;

  // Calculate final dimensions to fit inside the bounds while preserving the aspect ratio.
  let width = sourceWidth;
  let height = sourceHeight;

  const widthRatio = boundWidth / width;
  const heightRatio = boundHeight / height;
  const scale = Math.min(widthRatio, heightRatio, 1); // Don't scale up (max scale of 1)

  width *= scale;
  height *= scale;

  return {
    width,
    height,
    drawImageParams: [sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height] as const,
  };
};
