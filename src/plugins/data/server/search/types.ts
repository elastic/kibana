/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import {
  IScopedClusterClient,
  IUiSettingsClient,
  SavedObjectsClientContract,
  KibanaRequest,
} from 'src/core/server';
import {
  ISearchOptions,
  ISearchStartSearchSource,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchClient,
} from '../../common/search';
import { AggsSetup, AggsStart } from './aggs';
import { SearchUsage } from './collectors';
import { IEsSearchRequest, IEsSearchResponse } from './es_search';
import { ISessionService } from './session';

export interface SearchEnhancements {
  defaultStrategy: string;
  sessionService: ISessionService;
}

export interface SearchStrategyDependencies {
  savedObjectsClient: SavedObjectsClientContract;
  esClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
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

  /**
   * @internal
   */
  __enhance: (enhancements: SearchEnhancements) => void;
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

export interface ISearchStart<
  SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest,
  SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse
> {
  aggs: AggsStart;
  /**
   * Get other registered search strategies by name (or, by default, the Elasticsearch strategy).
   * For example, if a new strategy needs to use the already-registered ES search strategy, it can
   * use this function to accomplish that.
   */
  getSearchStrategy: (
    name?: string // Name of the search strategy (defaults to the Elasticsearch strategy)
  ) => ISearchStrategy<SearchStrategyRequest, SearchStrategyResponse>;
  asScoped: (request: KibanaRequest) => ISearchClient;
  searchSource: {
    asScoped: (request: KibanaRequest) => Promise<ISearchStartSearchSource>;
  };
}
