/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_CONTAINER_SELECTOR } from './lib';
import { takePreviewScreenshot } from './take_screenshot';
import type { UsePreviewScreenshotOptions } from './types';

/**
 * React hook to create a function that captures a preview screenshot
 * of a specified container element.
 *
 * If the `savedObjectId` is `undefined`, the hook returns a `noop` that
 * resolves to `false`.
 */
export const usePreviewScreenshot = ({
  savedObjectId,
  querySelector = DEFAULT_CONTAINER_SELECTOR,
  ...rest
}: UsePreviewScreenshotOptions) => {
  if (!savedObjectId) {
    return () => Promise.resolve(false);
  }

  return () => {
    const container = document.querySelector(querySelector);

    if (!container) {
      return Promise.resolve(false);
    }

    return takePreviewScreenshot({ ...rest, savedObjectId, querySelector });
  };
};
