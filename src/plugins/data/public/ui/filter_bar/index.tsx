/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import type { FilterItemProps } from './filter_item';

const LazyFilterItem = React.lazy(() => import('./filter_item'));
export const FilterItem = (props: FilterItemProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterItem {...props} />
  </React.Suspense>
);
