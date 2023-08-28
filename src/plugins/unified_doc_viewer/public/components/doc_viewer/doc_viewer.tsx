/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DocViewer, DocViewsRegistry } from '@kbn/unified-doc-viewer';

export interface UnifiedDocViewerProps extends DocViewRenderProps {
  registry: DocViewsRegistry;
}

export function UnifiedDocViewer({ registry, ...renderProps }: UnifiedDocViewerProps) {
  const { hit } = renderProps;

  return <DocViewer docViews={registry.getDocViewsSorted(hit)} {...renderProps} />;
}
