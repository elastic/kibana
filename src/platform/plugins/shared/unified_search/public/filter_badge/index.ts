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

export { FilterContent, FilterContentLazy } from './filter_content';

/**
 * The Lazily-loaded `FilterBadge` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const FilterBadgeLazy = React.lazy(() => import('./filter_badge'));

/**
 * A `FilterBadge` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterBadgeLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterBadge = withSuspense(FilterBadgeLazy);

/**
 * The Lazily-loaded `FilterBadgeGroup` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const FilterBadgeGroupLazy = React.lazy(() => import('./filter_badge_group'));

/**
 * A `FilterBadgeGroup` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterBadgeGroupLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterBadgeGroup = withSuspense(FilterBadgeGroupLazy);
