/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

import { Fallback } from './fallback';

export { ExitFullScreenButtonKibanaProvider, ExitFullScreenButtonProvider } from './services';
export { ExitFullScreenButton as ExitFullScreenButtonComponent } from './exit_full_screen_button.component';

// Since the Exit Full Screen Button will almost always be rendered by itself and/or rarely (e.g. when
// a user opts to enter full - screen mode), it makes sense to provide an async version of the button.

/**
 * A lazily-loadable component that can be used to exit "full screen mode" in Kibana. Must be directly wrapped in
 * `React.Suspense` and a parent wrapped in either `ExitFullScreenButtonProvider` or `ExitFullScreenButtonKibanaProvider`
 * for relevant services.
 */
export const LazyExitFullScreenButton = React.lazy(() =>
  import('./exit_full_screen_button').then(({ ExitFullScreenButton }) => ({
    default: ExitFullScreenButton,
  }))
);

/**
 * A lazily-loadable component that can be used to exit "full screen mode" in Kibana.  Requires a parent wrapped in
 * either `ExitFullScreenButtonProvider` or `ExitFullScreenButtonKibanaProvider` for relevant services.
 */
export const ExitFullScreenButton = withSuspense(LazyExitFullScreenButton, <Fallback />);
