/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext } from 'react';
import type { createValidateUrl } from '../../utils/validate_url';

export interface ImageViewerContextValue {
  getImageDownloadHref: (fileId: string) => string;
  validateUrl: ReturnType<typeof createValidateUrl>;
}

export const ImageViewerContext = createContext<ImageViewerContextValue>(
  null as unknown as ImageViewerContextValue
);

export const useImageViewerContext = () => {
  const ctx = useContext(ImageViewerContext);
  if (!ctx) {
    throw new Error('ImageViewerContext is not found!');
  }
  return ctx;
};
