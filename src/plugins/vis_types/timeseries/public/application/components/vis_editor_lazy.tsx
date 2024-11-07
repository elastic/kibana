/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { TimeseriesEditorProps } from './vis_editor';

const VisEditorComponent = lazy(() => import('./vis_editor'));

export const VisEditor = (props: TimeseriesEditorProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <VisEditorComponent {...props} />
  </Suspense>
);
