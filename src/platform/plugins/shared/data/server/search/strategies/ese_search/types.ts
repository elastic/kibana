/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AsyncSearchGetRequest,
  SearchResponse,
  ShardStatistics,
} from '@elastic/elasticsearch/lib/api/types';
import type { ISearchRequestParams } from '@kbn/search-types';

export interface IAsyncSearchRequestParams extends ISearchRequestParams {
  keep_alive?: AsyncSearchGetRequest['keep_alive'];
  wait_for_completion_timeout?: AsyncSearchGetRequest['wait_for_completion_timeout'];
}

export interface AsyncSearchResponse<T = unknown> {
  id?: string;
  response: SearchResponse<T>;
  start_time_in_millis: number;
  expiration_time_in_millis: number;
  is_partial: boolean;
  is_running: boolean;
}
export interface AsyncSearchStatusResponse extends Omit<AsyncSearchResponse, 'response'> {
  completion_status?: number;
  _shards: ShardStatistics;
}
