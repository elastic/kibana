/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import { ApiResponse, TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';

import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../types';

export const EQL_SEARCH_STRATEGY = 'eql';

export type EqlRequestParams = EqlSearch<Record<string, unknown>>;

export interface EqlSearchStrategyRequest extends IKibanaSearchRequest<EqlRequestParams> {
  options?: TransportRequestOptions;
}

export type EqlSearchStrategyResponse<T = unknown> = IKibanaSearchResponse<ApiResponse<T>>;
