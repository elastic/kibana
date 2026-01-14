/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import type {
  ISearchClient,
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
  IEsSearchResponse,
  IEsSearchRequest,
} from '@kbn/search-types';

class CachedUiSettingsClient {
  private cache: Record<string, any> = {};

  constructor(private uiSettingsClient: any) {}

  async get<T = any>(key: string): Promise<T> {
    if (this.cache[key] === undefined) {
      this.cache[key] = await this.uiSettingsClient.get(key);
    }
    return this.cache[key];
  }
}

type IScopedSearchSessionsClient = SearchStrategyDependencies['searchSessionsClient'];

const createMinimalSearchSessionsClient = (): IScopedSearchSessionsClient => {
  return {
    getId: async () => '',
    save: async () => ({ id: '', attributes: {} } as any),
    get: async () => ({ id: '', attributes: {} } as any),
    find: async () => ({ saved_objects: [], total: 0 } as any),
    update: async () => ({ id: '', attributes: {} } as any),
    cancel: async () => ({ id: '', attributes: {} } as any),
    delete: async (sessionId: string) => Promise<{}> as any,
    extend: async () => ({ id: '', attributes: {} } as any),
    status: async () => ({ status: 'complete' } as any),
    trackId: async () => {},
    getSearchIdMapping: async () => new Map(),
    getConfig: () => ({} as any),
  };
};

export const createInternalSearchClient = (
  core: CoreStart,
  dataPluginStart: DataPluginStart,
  request: KibanaRequest,
  rollupsEnabled: boolean = false
): ISearchClient => {
  const { elasticsearch, savedObjects, uiSettings } = core;
  const internalSearchStrategy = dataPluginStart.search.searchAsInternalUser;
  const savedObjectsClient = savedObjects.getScopedClient(request);
  const searchSessionsClient = createMinimalSearchSessionsClient();

  const deps: SearchStrategyDependencies = {
    searchSessionsClient,
    savedObjectsClient,
    esClient: elasticsearch.client.asScoped(request),
    uiSettingsClient: new CachedUiSettingsClient(uiSettings.asScopedToClient(savedObjectsClient)),
    request,
    rollupsEnabled,
  };

  return {
    search: <
      SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
      SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
    >(
      searchRequest: SearchStrategyRequest,
      options: ISearchOptions = {}
    ) => internalSearchStrategy.search(searchRequest, options, deps),

    cancel: (id: string, options?: ISearchOptions) =>
      internalSearchStrategy.cancel?.(id, options || {}, deps) || Promise.resolve(),

    extend: (id: string, keepAlive: string, options?: ISearchOptions) =>
      internalSearchStrategy.extend?.(id, keepAlive, options || {}, deps) || Promise.resolve(),
  };
};
