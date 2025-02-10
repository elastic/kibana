/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/src/services/types';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';

const LazyUnifiedDocViewer = React.lazy(() => import('./doc_viewer'));
export const UnifiedDocViewer = withSuspense<DocViewRenderProps>(
  LazyUnifiedDocViewer,
  <EuiDelayRender delay={300}>
    <EuiSkeletonText />
  </EuiDelayRender>
);
