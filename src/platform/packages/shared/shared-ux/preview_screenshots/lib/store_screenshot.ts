/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PreviewScreenshot, StorePreviewScreenshotFn } from '../types';
import { getStorageKey } from './get_storage_key';

/**
 * Stores a preview screenshot in `sessionStorage` using a unique key, like a
 * `savedObjectId`. The screenshot is stored as a base64-encoded data URL, along
 * with a timestamp.
 *
 * Returns `true` if the screenshot was successfully stored, `false` otherwise,
 * (e.g., storage quota exceeded).
 */
export const storePreviewScreenshot: StorePreviewScreenshotFn = ({ savedObjectId, dataUrl }) => {
  const key = getStorageKey(savedObjectId);

  const preview: PreviewScreenshot = {
    image: dataUrl,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(preview));
    return true;
  } catch (e) {
    // Handle storage error (e.g., quota exceeded)
    /* eslint-disable-next-line no-console */
    console.error('Failed to save preview image to sessionStorage', e);

    const item = sessionStorage.getItem(key);

    if (item) {
      try {
        JSON.parse(item);
      } catch (parseError) {
        sessionStorage.removeItem(key);
      }
    }
    return false;
  }
};
