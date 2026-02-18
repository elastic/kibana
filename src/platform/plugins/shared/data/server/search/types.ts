/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type {
  IRouter,
  IScopedClusterClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
  KibanaRequest,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import type {
  ISearchClient,
  IKibanaSearchResponse,
  IKibanaSearchRequest,
  ISearchOptions,
  IEsSearchResponse,
  IEsSearchRequest,
} from '@kbn/search-types';

import type { ISearchStartSearchSource, SearchSourceService } from '../../common/search';
import type { AggsSetup, AggsStart } from './aggs';
import type { SearchUsage } from './collectors/search';
import type { IScopedSearchSessionsClient } from './session';

export interface SearchStrategyDependencies {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  uiSettingsClient: Pick<IUiSettingsClient, 'get'>;
  searchSessionsClient: IScopedSearchSessionsClient;
  request: KibanaRequest;
  rollupsEnabled?: boolean;
}

export interface ISearchSetup {
  aggs: AggsSetup;
  /**
   * Extension point exposed for other plugins to register their own search
   * strategies.
   */
  registerSearchStrategy: <
    SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
    SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
  >(
    name: string,
    strategy: ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>
  ) => void;

  /**
   * Used internally for telemetry
   */
  usage?: SearchUsage;
  enableRollups: () => void;
  searchSource: ReturnType<SearchSourceService['setup']>;
}

/**
 * Search strategy interface contains a search method that takes in a request and returns a promise
 * that resolves to a response.
 */
export interface ISearchStrategy<
  SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
> {
  search: (
    request: SearchStrategyRequest,
    options: ISearchOptions,
    deps: SearchStrategyDependencies
  ) => Observable<SearchStrategyResponse>;
  cancel?: (id: string, options: ISearchOptions, deps: SearchStrategyDependencies) => Promise<void>;
  extend?: (
    id: string,
    keepAlive: string,
    options: ISearchOptions,
    deps: SearchStrategyDependencies
  ) => Promise<void>;
}

export interface IScopedSearchClient extends ISearchClient {
  saveSession: IScopedSearchSessionsClient['save'];
  getSession: IScopedSearchSessionsClient['get'];
  findSessions: IScopedSearchSessionsClient['find'];
  updateSession: IScopedSearchSessionsClient['update'];
  cancelSession: IScopedSearchSessionsClient['cancel'];
  deleteSession: IScopedSearchSessionsClient['delete'];
  extendSession: IScopedSearchSessionsClient['extend'];
  getSessionStatus: IScopedSearchSessionsClient['status'];
  updateSessionStatuses: IScopedSearchSessionsClient['updateStatuses'];
}

export interface ISearchStart<
  SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
> {
  aggs: AggsStart;
  /**
   * Search as the internal Kibana system user. This is not a registered search strategy as we don't
   * want to allow access from the client.
   * @deprecated Use {@link INTERNAL_ENHANCED_ES_SEARCH_STRATEGY} instead.
   */
  searchAsInternalUser: ISearchStrategy;
  /**
   * Get other registered search strategies by name (or, by default, the Elasticsearch strategy).
   * For example, if a new strategy needs to use the already-registered ES search strategy, it can
   * use this function to accomplish that.
   */
  getSearchStrategy: (
    name?: string | symbol // Name of the search strategy (defaults to the Elasticsearch strategy)
  ) => ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>;
  asScoped: (request: KibanaRequest) => IScopedSearchClient;
  searchSource: {
    asScoped: (request: KibanaRequest) => Promise<ISearchStartSearchSource>;
  };
}

export type SearchRequestHandlerContext = IScopedSearchClient;

export type DataRequestHandlerContext = CustomRequestHandlerContext<{
  search: SearchRequestHandlerContext;
}>;

export type DataPluginRouter = IRouter<DataRequestHandlerContext>;
