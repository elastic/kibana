/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export { ImageViewerContext, type ImageViewerContextValue } from './image_viewer_context';
import type { ImageViewerProps } from './image_viewer';

const LazyImageViewer = React.lazy(() =>
  import('./image_viewer').then((m) => ({ default: m.ImageViewer }))
);
export const ImageViewer = (props: ImageViewerProps) => (
  <React.Suspense fallback={<></>}>
    <LazyImageViewer {...props} />
  </React.Suspense>
);
