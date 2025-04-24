/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export type { FilterItemsProps } from './filter_item/filter_items';

const Fallback = () => <div />;

const LazyFilterBar = React.lazy(async () => {
  const { FilterBar } = await import('../ui_module');
  return { default: FilterBar };
});
export const FilterBar = (props: React.ComponentProps<typeof LazyFilterBar>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterBar {...props} />
  </React.Suspense>
);

const LazyFilterItems = React.lazy(async () => {
  const { FilterItems } = await import('../ui_module');
  return { default: FilterItems };
});
/**
 * Renders a group of filter pills
 */
export const FilterItems = (props: React.ComponentProps<typeof LazyFilterItems>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterItems {...props} />
  </React.Suspense>
);

const LazyFilterItem = React.lazy(async () => {
  const { FilterItem } = await import('../ui_module');
  return { default: FilterItem };
});
/**
 * Renders a single filter pill
 */
export const FilterItem = (props: React.ComponentProps<typeof LazyFilterItem>) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFilterItem {...props} />
  </React.Suspense>
);
