/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export * from './expressions';

export { ISearchSetup, ISearchStart, ISearchStartSearchSource, SearchEnhancements } from './types';

export {
  ES_SEARCH_STRATEGY,
  EsQuerySortValue,
  extractReferences as extractSearchSourceReferences,
  getSearchParamsFromRequest,
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  injectReferences as injectSearchSourceReferences,
  ISearchGeneric,
  ISearchSource,
  parseSearchSourceJSON,
  SearchError,
  SearchRequest,
  SearchSource,
  SearchSourceDependencies,
  SearchSourceFields,
  SortDirection,
} from '../../common/search';
export {
  SessionService,
  ISessionService,
  SearchSessionInfoProvider,
  SearchSessionState,
  SessionsClient,
  ISessionsClient,
} from './session';
export { getEsPreference } from './es_search';

export { SearchInterceptor, SearchInterceptorDeps } from './search_interceptor';
export * from './errors';
