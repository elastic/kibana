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
 * An example of the solution toolbar button
 */
export { AddFromLibraryButton } from './toolbar';

/**
 * The Lazily-loaded `NoDataViews` component.  Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyNoDataViews = React.lazy(() =>
  import('./empty_state/no_data_views').then(({ NoDataViews }) => ({
    default: NoDataViews,
  }))
);

/**
 * A `NoDataViews` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `LazyNoDataViews` component lazily with
 * a predefined fallback and error boundary.
 */
export const NoDataViews = withSuspense(LazyNoDataViews);

/**
 * A pure `NoDataViews` component, with no services hooks. Consumers should use `React.Suspennse` or the
 * `withSuspense` HOC to load this component.
 */
export const LazyNoDataViewsComponent = React.lazy(() =>
  import('./empty_state/no_data_views').then(({ NoDataViewsComponent }) => ({
    default: NoDataViewsComponent,
  }))
);

/**
 * A pure `NoDataViews` component, with no services hooks. The component is wrapped by the `withSuspense` HOC.
 * This component can be used directly by consumers and will load the `LazyNoDataViewsComponent` lazily with
 * a predefined fallback and error boundary.
 */
export const NoDataViewsComponent = withSuspense(LazyNoDataViewsComponent);

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

/**
 * The Lazily-loaded `KibanaSolutionAvatar` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const KibanaSolutionAvatarLazy = React.lazy(() =>
  import('./solution_avatar').then(({ KibanaSolutionAvatar }) => ({
    default: KibanaSolutionAvatar,
  }))
);

/**
 * A `KibanaSolutionAvatar` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `KibanaPageTemplateSolutionNavAvatarLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const KibanaSolutionAvatar = withSuspense(KibanaSolutionAvatarLazy);
