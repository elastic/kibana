/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { NoDataViewsPrompt } from './no_data_views';
export { NoDataViewsPrompt as NoDataViewsPromptComponent } from './no_data_views.component';
export { NoDataViewsPromptKibanaProvider, NoDataViewsPromptProvider } from './services';
export type { NoDataViewsPromptKibanaServices, NoDataViewsPromptServices } from './services';

export {
  getMockServices as getNoDataViewsPromptMockServices,
  getStoryArgTypes as getNoDataViewsPromptStoryArgTypes,
  getStoryServices as getNoDataViewsPromptStorybookServices,
} from './mocks';
