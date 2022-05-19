/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export { NoDataViewsPromptKibanaProvider, NoDataViewsPromptProvider } from './services';
export type { NoDataViewsPromptKibanaServices, NoDataViewsPromptServices } from './services';

/**
 * The Lazily-loaded `NoDataViewsPrompt` component.  Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const NoDataViewsPromptLazy = React.lazy(() =>
  import('./no_data_views').then(({ NoDataViewsPrompt }) => ({
    default: NoDataViewsPrompt,
  }))
);

/**
 * A `NoDataViewsPrompt` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `NoDataViewsPromptLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const NoDataViewsPrompt = withSuspense(NoDataViewsPromptLazy);

/**
 * A pure `NoDataViewsPrompt` component, with no services hooks. Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const NoDataViewsPromptComponentLazy = React.lazy(() =>
  import('./no_data_views.component').then(({ NoDataViewsPrompt: Component }) => ({
    default: Component,
  }))
);

/**
 * A pure `NoDataViewsPrompt` component, with no services hooks. The component is wrapped by the `withSuspense` HOC.
 * This component can be used directly by consumers and will load the `NoDataViewsComponentLazy` lazily with
 * a predefined fallback and error boundary.
 */
export const NoDataViewsPromptComponent = withSuspense(NoDataViewsPromptComponentLazy);
