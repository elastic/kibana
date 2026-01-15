/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IUiSettingsClient,
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import type { ISearchClient, IKibanaSearchRequest, ISearchOptions } from '@kbn/search-types';

class CachedUiSettingsClient {
  private cache: Record<string, any> = {};

  constructor(private uiSettingsClient: IUiSettingsClient) {}

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
    delete: async (sessionId: string) => Promise<{}>,
    extend: async () => ({ id: '', attributes: {} } as any),
    status: async () => ({ status: 'complete' } as any),
    trackId: async () => {},
    getSearchIdMapping: async () => new Map(),
    getConfig: () => ({} as any),
  };
};

interface SearchClientDeps {
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  esClient: IScopedClusterClient;
}
// TODO move this into a method in abstract ExportType class
export const createInternalSearchClient = (
  deps: SearchClientDeps,
  dataPluginStart: DataPluginStart,
  request: KibanaRequest,
  rollupsEnabled: boolean = false
): ISearchClient => {
  const internalSearchStrategy = dataPluginStart.search.searchAsInternalUser;
  const { savedObjectsClient, uiSettingsClient, esClient } = deps;
  const searchSessionsClient = createMinimalSearchSessionsClient();

  const searchDeps: SearchStrategyDependencies = {
    searchSessionsClient,
    savedObjectsClient,
    esClient,
    uiSettingsClient: new CachedUiSettingsClient(uiSettingsClient),
    request,
    rollupsEnabled,
  };

  return {
    search: (searchRequest: IKibanaSearchRequest, options: ISearchOptions = {}) =>
      internalSearchStrategy.search(searchRequest, options, searchDeps),

    cancel: (id: string, options?: ISearchOptions) =>
      internalSearchStrategy.cancel?.(id, options || {}, searchDeps) || Promise.resolve(),

    extend: (id: string, keepAlive: string, options?: ISearchOptions) =>
      internalSearchStrategy.extend?.(id, keepAlive, options || {}, searchDeps) ||
      Promise.resolve(),
  };
};
