/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

export { AnalyticsNoDataPageProvider, AnalyticsNoDataPageKibanaProvider } from './services';

/**
 * Lazy-loaded connected component.  Must be wrapped in `React.Suspense`.
 */
export const LazyAnalyticsNoDataPage = React.lazy(() =>
  import('./analytics_no_data_page').then(({ AnalyticsNoDataPage }) => ({
    default: AnalyticsNoDataPage,
  }))
);

/**
 * An entire page that can be displayed when Kibana "has no data", specifically for Analytics.
 * Requires a Provider for relevant services.
 */
export const AnalyticsNoDataPage = withSuspense(LazyAnalyticsNoDataPage);
