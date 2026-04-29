/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { defer } from 'rxjs';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverStartPlugins } from '../types';

/**
 * Global search provider adding an ES|QL and ESQL entry.
 * This is necessary because ES|QL is part of the Discover application.
 *
 * It navigates to Discover with a default query extracted from the default dataview
 */
export const getESQLSearchProvider = (options: {
  isESQLEnabled: boolean;
  locator?: DiscoverAppLocator;
  getServices: () => Promise<[CoreStart, DiscoverStartPlugins]>;
}): GlobalSearchResultProvider => ({
  id: 'esql',
  find: (...findParams) => {
    return defer(async () => {
      const { searchProviderFind } = await import('./search_provider_find');
      return searchProviderFind(options, ...findParams);
    });
  },
  getSearchableTypes: () => ['application'],
});
