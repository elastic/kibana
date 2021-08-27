/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { DiscoverPlugin } from './plugin';

export { ISearchEmbeddable, SearchInput, SEARCH_EMBEDDABLE_TYPE } from './application/embeddable';
export { DiscoverAppLocator, DiscoverAppLocatorParams } from './locator';
export { DiscoverSetup, DiscoverStart } from './plugin';
export { createSavedSearchesLoader, SavedSearch, SavedSearchLoader } from './saved_searches';
export { loadSharingDataHelpers } from './shared';
export { DiscoverUrlGeneratorState, DISCOVER_APP_URL_GENERATOR } from './url_generator';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DiscoverPlugin(initializerContext);
}
