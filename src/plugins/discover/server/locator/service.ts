/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, KibanaRequest } from '@kbn/core/server';
import { DiscoverServerPluginLocatorService, DiscoverServerPluginStartDeps } from '..';
import { columnsFromLocatorFactory } from './columns_from_locator';
import { searchSourceFromLocatorFactory } from './searchsource_from_locator';
import { titleFromLocatorFactory } from './title_from_locator';
import { queryFromLocatorFactory } from './query_from_locator';
import { filtersFromLocatorFactory } from './filters_from_locator';

export const getScopedClient = (
  core: CoreStart,
  deps: DiscoverServerPluginStartDeps
): DiscoverServerPluginLocatorService => {
  return {
    asScopedClient: async (req: KibanaRequest<unknown>) => {
      const searchSourceStart = await deps.data.search.searchSource.asScoped(req);
      const savedObjects = core.savedObjects.getScopedClient(req);
      const uiSettings = core.uiSettings.asScopedToClient(savedObjects);
      const services = { searchSourceStart, savedObjects, uiSettings };

      return {
        columnsFromLocator: columnsFromLocatorFactory(services),
        searchSourceFromLocator: searchSourceFromLocatorFactory(services),
        titleFromLocator: titleFromLocatorFactory(services),
        queryFromLocator: queryFromLocatorFactory(services),
        filtersFromLocator: filtersFromLocatorFactory(services),
      };
    },
  };
};
