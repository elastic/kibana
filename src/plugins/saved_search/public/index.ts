/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { SavedSearch } from './services/saved_searches';
export {
  getSavedSearch,
  getSavedSearchFullPathUrl,
  getSavedSearchUrl,
  getSavedSearchUrlConflictMessage,
  throwErrorOnSavedSearchUrlConflict,
  SaveSavedSearchOptions,
  SortOrder,
  saveSavedSearch,
} from './services/saved_searches';
export {
  VIEW_MODE,
  DiscoverGridSettings,
  DiscoverGridSettingsColumn,
} from './services/saved_searches/types';

export function plugin() {
  return {
    setup: () => {},
    start: () => {},
  };
}
