/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest, PluginInitializerContext } from '@kbn/core/server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import {
  ColumnsFromLocatorFn,
  SearchSourceFromLocatorFn,
  TitleFromLocatorFn,
  QueryFromLocatorFn,
  FiltersFromLocatorFn,
} from './locator';

export interface DiscoverServerPluginStartDeps {
  data: DataPluginStart;
}

export interface LocatorServiceScopedClient {
  columnsFromLocator: ColumnsFromLocatorFn;
  searchSourceFromLocator: SearchSourceFromLocatorFn;
  titleFromLocator: TitleFromLocatorFn;
  queryFromLocator: QueryFromLocatorFn;
  filtersFromLocator: FiltersFromLocatorFn;
}

export interface DiscoverServerPluginLocatorService {
  asScopedClient: (req: KibanaRequest<unknown>) => Promise<LocatorServiceScopedClient>;
}

export interface DiscoverServerPluginStart {
  locator: DiscoverServerPluginLocatorService;
}

export { config } from './config';

export const plugin = async (context: PluginInitializerContext) => {
  const { DiscoverServerPlugin } = await import('./plugin');
  return new DiscoverServerPlugin(context);
};
