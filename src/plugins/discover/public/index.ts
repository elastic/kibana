/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { DiscoverPlugin } from './plugin';

export { DiscoverSetup, DiscoverStart } from './plugin';
export function plugin(initializerContext: PluginInitializerContext) {
  return new DiscoverPlugin(initializerContext);
}

export { SavedSearch, SavedSearchLoader, createSavedSearchesLoader } from './saved_searches';
export { ISearchEmbeddable, SEARCH_EMBEDDABLE_TYPE, SearchInput } from './application/embeddable';
export { DISCOVER_APP_URL_GENERATOR, DiscoverUrlGeneratorState } from './url_generator';
