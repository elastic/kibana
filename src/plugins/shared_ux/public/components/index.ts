/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from './utility';

/**
 * The Lazily-loaded `ExitFullScreenButton` component.  Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyExitFullScreenButton = React.lazy(() =>
  import('./exit_full_screen_button').then(({ ExitFullScreenButton }) => ({
    default: ExitFullScreenButton,
  }))
);

export const LazyToolbarButton = React.lazy(() =>
  import('./toolbar/index').then(({ ToolbarButton }) => ({
    default: ToolbarButton,
  }))
);

export const RedirectAppLinks = React.lazy(() => import('./redirect_app_links'));

/**
 * A `ExitFullScreenButton` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `LazyExitFullScreenButton` component lazily with
 * a predefined fallback and error boundary.
 */
export const ExitFullScreenButton = withSuspense(LazyExitFullScreenButton);

/**
 * A `ToolbarButton` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `LazyToolbarButton` component lazily with
 * a predefined fallback and error boundary.
 */
export const ToolbarButton = withSuspense(LazyToolbarButton);

/**
 * The Lazily-loaded `NoDataViews` component.  Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyNoDataViewsPage = React.lazy(() =>
  import('./empty_state/no_data_views').then(({ NoDataViews }) => ({
    default: NoDataViews,
  }))
);

/**
 * A `NoDataViewsPage` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `LazyNoDataViewsPage` component lazily with
 * a predefined fallback and error boundary.
 */
export const NoDataViewsPage = withSuspense(LazyNoDataViewsPage);

/**
 * The Lazily-loaded `IconButtonGroup` component.  Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyIconButtonGroup = React.lazy(() =>
  import('./toolbar/index').then(({ IconButtonGroup }) => ({
    default: IconButtonGroup,
  }))
);

/**
 * The IconButtonGroup component that is wrapped by the `withSuspence` HOC.
 */
export const IconButtonGroup = withSuspense(LazyIconButtonGroup);
