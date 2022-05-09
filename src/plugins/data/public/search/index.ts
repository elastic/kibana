/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './expressions';

export type {
  ISearchSetup,
  ISearchStart,
  ISearchStartSearchSource,
  SearchUsageCollector,
} from './types';

export type {
  EsQuerySortValue,
  IEsSearchRequest,
  IEsSearchResponse,
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchGeneric,
  ISearchSource,
  SearchError,
  SearchRequest,
  SearchSourceDependencies,
  SearchSourceFields,
  SerializedSearchSourceFields,
} from '../../common/search';
export {
  ES_SEARCH_STRATEGY,
  extractReferences as extractSearchSourceReferences,
  getSearchParamsFromRequest,
  injectReferences as injectSearchSourceReferences,
  parseSearchSourceJSON,
  SearchSource,
  SortDirection,
  checkColumnForPrecisionError,
} from '../../common/search';
export type {
  ISessionService,
  SearchSessionInfoProvider,
  ISessionsClient,
  WaitUntilNextSessionCompletesOptions,
} from './session';
export {
  SessionService,
  SearchSessionState,
  SessionsClient,
  noSearchSessionStorageCapabilityMessage,
  SEARCH_SESSIONS_MANAGEMENT_ID,
  waitUntilNextSessionCompletes$,
} from './session';
export { getEsPreference } from './es_search';
export { handleResponse } from './fetch';

export type { SearchInterceptorDeps } from './search_interceptor';
export { SearchInterceptor } from './search_interceptor';
export * from './errors';

export { SearchService } from './search_service';
