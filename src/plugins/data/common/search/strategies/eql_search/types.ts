/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EqlSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EqlSearchRequest as EqlSearchRequestWithBody } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { TransportRequestOptions } from '@elastic/elasticsearch';

import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../types';

export const EQL_SEARCH_STRATEGY = 'eql';

export type EqlRequestParams = EqlSearchRequest | EqlSearchRequestWithBody;

export interface EqlSearchStrategyRequest extends IKibanaSearchRequest<EqlRequestParams> {
  /**
   * @deprecated: use IAsyncSearchOptions.transport instead.
   */
  options?: TransportRequestOptions;
}

export type EqlSearchStrategyResponse<T = unknown> = IKibanaSearchResponse<T>;
