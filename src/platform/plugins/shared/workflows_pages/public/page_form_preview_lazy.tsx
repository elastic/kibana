/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { PageFormPreviewProps } from './types';

// rjsf loads only when an author opens the preview, not with the plugin.
const LazyPageFormPreview = lazy(() =>
  import('./page_app/page_form').then(({ PageFormPreview }) => ({ default: PageFormPreview }))
);

export const PageFormPreview = (props: PageFormPreviewProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <LazyPageFormPreview {...props} />
  </Suspense>
);
