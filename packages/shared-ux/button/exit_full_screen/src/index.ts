/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export { ExitFullScreenButtonKibanaProvider, ExitFullScreenButtonProvider } from './services';

/**
 * Lazy-loaded pure component.  Must be wrapped in `React.Suspense`.
 */
export const LazyExitFullScreenButtonComponent = React.lazy(() =>
  import('./exit_full_screen_button.component').then(({ ExitFullScreenButton }) => ({
    default: ExitFullScreenButton,
  }))
);

/**
 * A pure component that resembles a button to exit full screen mode.
 */
export const ExitFullScreenButtonComponent = withSuspense(LazyExitFullScreenButtonComponent);

/**
 * Lazy-loaded connected component.  Must be wrapped in `React.Suspense` and a Provider.
 */
export const LazyExitFullScreenButton = React.lazy(() =>
  import('./exit_full_screen_button').then(({ ExitFullScreenButton }) => ({
    default: ExitFullScreenButton,
  }))
);

/**
 * A component that can be used to exit full screen mode in Kibana.  Requires a Provider for
 * relevant services.
 */
export const ExitFullScreenButton = withSuspense(LazyExitFullScreenButton);
