/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  VIEW_MODE,
  MIN_SAVED_SEARCH_SAMPLE_SIZE,
  MAX_SAVED_SEARCH_SAMPLE_SIZE,
} from '@kbn/saved-search';
export type { DiscoverGridSettings, DiscoverGridSettingsColumn } from '@kbn/saved-search/types';
export { getSavedSearchUrl, getSavedSearchFullPathUrl } from './saved_searches_url';
export { fromSavedSearchAttributes } from './saved_searches_utils';

export type { SavedSearch, SavedSearchAttributes } from './types';

export { SavedSearchType, LATEST_VERSION } from './constants';
export { getKibanaContextFn } from './expressions/kibana_context';
