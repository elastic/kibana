/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { AnalyticsNoDataPageProvider, AnalyticsNoDataPageKibanaProvider } from './services';
export { AnalyticsNoDataPage } from './analytics_no_data_page';
export { AnalyticsNoDataPage as AnalyticsNoDataPageComponent } from './analytics_no_data_page.component';

export {
  getMockServices as getAnalyticsNoDataPageMockServices,
  getStoryArgTypes as getAnalyticsNoDataPageStoryArgTypes,
  getStoryServices as getAnalyticsNoDataPageStoryServices,
} from './mocks';
