/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { DiscoverPlugin } from './plugin';

export type { SavedSearch } from './services/saved_searches';
export {
  getSavedSearch,
  getSavedSearchFullPathUrl,
  getSavedSearchUrl,
  getSavedSearchUrlConflictMessage,
  throwErrorOnSavedSearchUrlConflict,
} from './services/saved_searches';

export type { DiscoverSetup, DiscoverStart } from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DiscoverPlugin(initializerContext);
}

export type { ISearchEmbeddable, SearchInput } from './embeddable';
export { SEARCH_EMBEDDABLE_TYPE } from './embeddable';
export { loadSharingDataHelpers } from './utils';

export { DISCOVER_APP_LOCATOR } from './locator';
export type { DiscoverAppLocator, DiscoverAppLocatorParams } from './locator';
