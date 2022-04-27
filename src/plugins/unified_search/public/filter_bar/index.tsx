/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

/**
 * The Lazily-loaded `FilterBar` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
const FilterBarLazy = React.lazy(() => import('./filter_bar'));

/**
 * A `FilterBar` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `FilterBarLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterBar = withSuspense(FilterBarLazy);

/**
 * The Lazily-loaded `FilterLabel` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
const FilterLabelLazy = React.lazy(() => import('./filter_editor/lib/filter_label'));

/**
 * A `FilterLabel` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `FilterLabelLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterLabel = withSuspense(FilterLabelLazy);

/**
 * The Lazily-loaded `FilterItem` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
const FilterItemLazy = React.lazy(() => import('./filter_item'));

/**
 * A `FilterItem` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `FilterItemLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterItem = withSuspense(FilterItemLazy);
