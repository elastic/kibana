/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { Search } from '@elastic/elasticsearch/api/requestParams';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../types';

export const ES_SEARCH_STRATEGY = 'es';

export type ISearchRequestParams<T = Record<string, any>> = {
  trackTotalHits?: boolean;
} & Search<T>;

export interface IEsSearchRequest extends IKibanaSearchRequest<ISearchRequestParams> {
  indexType?: string;
}

export type IEsSearchResponse<Source = any> = IKibanaSearchResponse<SearchResponse<Source>>;
