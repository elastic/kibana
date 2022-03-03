/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

/**
 * The lazily-loaded `NoDataViews` component that is wrapped by the `withSuspense` HOC. Consumers should use `React.Suspense` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyNoDataViewsComponent = React.lazy(() =>
  import('./empty_state/no_data_views').then(({ NoDataViewsComponent }) => ({
    default: NoDataViewsComponent,
  }))
);

/**
 * A `NoDataViews` component and its props.  This component is a pure UI
 * component, and has no reference to services.
 */
export { NoDataViewsComponent } from './empty_state';
export type { NoDataViewsComponentProps } from './empty_state';
