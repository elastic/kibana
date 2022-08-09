/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SavedSearch, SaveSavedSearchOptions, SortOrder } from './services/saved_searches';
export {
  getSavedSearch,
  getSavedSearchFullPathUrl,
  getSavedSearchUrl,
  getSavedSearchUrlConflictMessage,
  throwErrorOnSavedSearchUrlConflict,
  saveSavedSearch,
} from './services/saved_searches';
export type {
  DiscoverGridSettings,
  DiscoverGridSettingsColumn,
} from './services/saved_searches/types';
export { VIEW_MODE } from './services/saved_searches/types';

export function plugin() {
  return {
    setup: () => {},
    start: () => {},
  };
}
