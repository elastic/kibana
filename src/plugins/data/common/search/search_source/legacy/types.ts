/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { ApiResponse } from '@elastic/elasticsearch';
import { SearchResponse } from 'elasticsearch';
import { FetchHandlers, SearchRequest } from '../fetch';

interface MsearchHeaders {
  index: string;
  preference?: number | string;
}

interface MsearchRequest {
  header: MsearchHeaders;
  body: any;
}

// @internal
export interface MsearchRequestBody {
  searches: MsearchRequest[];
}

// @internal
export interface MsearchResponse {
  body: ApiResponse<{ responses: Array<SearchResponse<any>> }>;
}

// @internal
export interface LegacyFetchHandlers {
  callMsearch: (params: {
    body: MsearchRequestBody;
    signal: AbortSignal;
  }) => Promise<MsearchResponse>;
  loadingCount$: BehaviorSubject<number>;
}

export interface SearchStrategySearchParams extends FetchHandlers {
  searchRequests: SearchRequest[];
}

// @deprecated
export interface SearchStrategyProvider {
  id: string;
  search: (params: SearchStrategySearchParams) => SearchStrategyResponse;
}

export interface SearchStrategyResponse<T = any> {
  searching: Promise<Array<SearchResponse<T>>>;
  abort: () => void;
}
