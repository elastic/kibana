/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { Indices } from '@elastic/elasticsearch/api/types';

import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../types';

export const ROLLUP_SEARCH_STRATEGY = 'rollup';

export interface IRollupSearchRequestParams extends estypes.SearchRequest {
  index: Indices; // index is required
}

export type IRollupSearchRequest = IKibanaSearchRequest<IRollupSearchRequestParams>;

export type IRollupSearchResponse<Source = any> = IKibanaSearchResponse<
  estypes.SearchResponse<Source>
>;
