/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { KibanaNoDataPageServices, KibanaNoDataPageKibanaDependencies } from './services';

export { KibanaNoDataPage } from './kibana_no_data_page';
export { KibanaNoDataPageKibanaProvider, KibanaNoDataPageProvider } from './services';

export {
  getStoryArgTypes as getKibanaNoDataPageStoryArgTypes,
  getStoryServices as getKibanaNoDataPageStoryMock,
  getMockServices as getKibanaNoDataPageMockServices,
} from './mocks';
