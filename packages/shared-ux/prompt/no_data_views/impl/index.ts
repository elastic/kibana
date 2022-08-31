/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  NoDataViewsPromptComponentProps,
  NoDataViewsPromptKibanaDependencies,
  NoDataViewsPromptProps,
  NoDataViewsPromptServices,
} from '@kbn/shared-ux-prompt-no-data-views-types';

export { NoDataViewsPrompt } from './src/no_data_views';
export { NoDataViewsPrompt as NoDataViewsPromptComponent } from './src/no_data_views.component';
export { NoDataViewsPromptKibanaProvider, NoDataViewsPromptProvider } from './src/services';
