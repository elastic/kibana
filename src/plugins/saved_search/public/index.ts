/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SortOrder } from '../common/types';
export type { SavedSearch, SaveSavedSearchOptions } from './services/saved_searches';
export {
  getSavedSearch,
  getSavedSearchFullPathUrl,
  getSavedSearchUrl,
  getSavedSearchUrlConflictMessage,
  throwErrorOnSavedSearchUrlConflict,
  saveSavedSearch,
} from './services/saved_searches';
export { VIEW_MODE } from '../common';

export function plugin() {
  return {
    setup: () => {},
    start: () => {},
  };
}
