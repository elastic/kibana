/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import type { FilterLabelProps } from './filter_editor/lib/filter_label';

const Fallback = () => <div />;

const LazyFilterLabel = React.lazy(() => import('./filter_editor/lib/filter_label'));
export const FilterLabel = (props: FilterLabelProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterLabel {...props} />
  </React.Suspense>
);
