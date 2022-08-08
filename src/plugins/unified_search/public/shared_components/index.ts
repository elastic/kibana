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
 * The Lazily-loaded `FiltersEditor` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const FiltersEditorLazy = React.lazy(() => import('./filters_editor'));

/**
 * A `FiltersEditor` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FiltersEditorLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FiltersEditor = withSuspense(FiltersEditorLazy);

/**
 * The Lazily-loaded `FilterEditor` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const FilterEditorLazy = React.lazy(() => import('./filter_editor'));

/**
 * A `FilterEditor` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FilterEditor` component lazily with
 * a predefined fallback and error boundary.
 */
export const FilterEditor = withSuspense(FilterEditorLazy);
