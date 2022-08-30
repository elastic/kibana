/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { AnalyticsNoDataPageProvider, AnalyticsNoDataPageKibanaProvider } from './src/services';
export { AnalyticsNoDataPage } from './src/analytics_no_data_page';
export { AnalyticsNoDataPage as AnalyticsNoDataPageComponent } from './src/analytics_no_data_page.component';

export type {
  AnalyticsNoDataPageServices,
  AnalyticsNoDataPageKibanaDependencies,
  AnalyticsNoDataPageProps,
} from '@kbn/shared-ux-page-analytics-no-data-types';
