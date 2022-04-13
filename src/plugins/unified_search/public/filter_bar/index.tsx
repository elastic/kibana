/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

const Fallback = () => <div />;

const LazyFilterBar = React.lazy(() => import('./filter_bar'));
export const FilterBar = (props: React.ComponentProps<typeof LazyFilterBar>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterBar {...props} />
  </React.Suspense>
);

const LazyFilterBadgesWrapper = React.lazy(() => import('./filter_badges_wrapper'));
export const FilterBadgesWrapper = (
  props: React.ComponentProps<typeof LazyFilterBadgesWrapper>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterBadgesWrapper {...props} />
  </React.Suspense>
);

const LazyFilterLabel = React.lazy(() => import('./filter_editor/lib/filter_label'));
export const FilterLabel = (props: React.ComponentProps<typeof LazyFilterLabel>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterLabel {...props} />
  </React.Suspense>
);

const LazyFilterItem = React.lazy(() => import('./filter_item'));
export const FilterItem = (props: React.ComponentProps<typeof LazyFilterItem>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterItem {...props} />
  </React.Suspense>
);
