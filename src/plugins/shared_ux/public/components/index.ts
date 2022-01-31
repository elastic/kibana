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
export const LazyExitFullScreenButton = React.lazy(() => import('./exit_full_screen_button'));

/**
 * A `ExitFullScreenButton` component that is wrapped by the `withSuspense` HOC.  This component can
 * be used directly by consumers and will load the `LazyExitFullScreenButton` component lazily with
 * a predefined fallback and error boundary.
 */
export const ExitFullScreenButton = withSuspense(LazyExitFullScreenButton);
