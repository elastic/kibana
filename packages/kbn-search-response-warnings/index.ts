/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SearchResponseInterceptedWarning } from './src/types';

export {
  SearchResponseWarnings,
  type SearchResponseWarningsProps,
} from './src/components/search_response_warnings';

export {
  getSearchResponseInterceptedWarnings,
  removeInterceptedWarningDuplicates,
} from './src/utils/get_search_response_intercepted_warnings';
