/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DocViewer } from '@kbn/unified-doc-viewer';
import type { UnifiedDocViewerServices } from '../../types';

interface UnifiedDocViewerProps extends DocViewRenderProps {
  services: UnifiedDocViewerServices;
}

export function UnifiedDocViewer({ services, ...renderProps }: UnifiedDocViewerProps) {
  const { hit } = renderProps;
  const { unifiedDocViewer } = services;
  return <DocViewer docViews={unifiedDocViewer.getDocViews(hit)} {...renderProps} />;
}
