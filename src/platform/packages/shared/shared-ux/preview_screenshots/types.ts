/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A function that stores the preview screenshot.  Returns true if the screenshot
 * was successfully stored, false otherwise.
 */
export type StorePreviewScreenshotFn = ({
  savedObjectId,
  dataUrl,
}: {
  savedObjectId: string;
  dataUrl: string;
}) => boolean;

/**
 * Represents a preview screenshot, which includes the image data as a base64-encoded
 * data URL and an optional `timestamp` indicating when the screenshot was taken.
 */
export interface PreviewScreenshot {
  /** The base64-encoded data URL of the screenshot image. */
  image?: string;
  /** An optional timestamp indicating when the screenshot was captured. */
  timestamp?: number;
}

/**
 * Common options for taking a preview screenshot.
 */
interface CommonOptions {
  /** A query selector to find the HTML container to target.  Default is `.kbnAppWrapper`. */
  querySelector?: string;
  /** A function to store the screenshot.  Default stores to session storage. */
  storeScreenshot?: StorePreviewScreenshotFn;
  /** The scroll distance from the left of the window.  Default is `0`. */
  scrollX?: number;
  /** The scroll distance from the top of the window.  Default is `0`. */
  scrollY?: number;
  /** The aspect ratio of the resulting image.  Default is `0.75`. */
  aspectRatio?: number;
  /** The maximum width of the resulting image.  Default is `400`. */
  maxWidth?: number;
  /** The maximum height of the resulting image.  Overriden if aspect ratio is provided. */
  maxHeight?: number;
}

/**
 * Options for the `usePreviewScreenshot` hook.
 */
export interface UsePreviewScreenshotOptions extends CommonOptions {
  /**
   * The ID of the Saved Object.  This can actually be any known identifier.  It can
   * be `undefined`, since it may not be immediately available.
   */
  savedObjectId?: string;
}

/**
 * Options for the `takePreviewScreenshot` function.
 */
export interface TakePreviewScreenshotOptions extends CommonOptions {
  /** The ID of the Saved Object.  This can actually be any known identifier. */
  savedObjectId: string;
}
