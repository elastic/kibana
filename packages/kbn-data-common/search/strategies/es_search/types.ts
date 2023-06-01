/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../types';

export const ES_SEARCH_STRATEGY = 'es';

export type ISearchRequestParams = {
  trackTotalHits?: boolean;
} & estypes.SearchRequest;

export interface IEsSearchRequest extends IKibanaSearchRequest<ISearchRequestParams> {
  indexType?: string;
}

export type IEsSearchResponse<Source = any> = IKibanaSearchResponse<estypes.SearchResponse<Source>>;
