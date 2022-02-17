/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface AsyncSearchResponse<T = unknown> {
  id?: string;
  response: estypes.SearchResponse<T>;
  start_time_in_millis: number;
  expiration_time_in_millis: number;
  is_partial: boolean;
  is_running: boolean;
}
export interface AsyncSearchStatusResponse extends Omit<AsyncSearchResponse, 'response'> {
  completion_status: number;
  _shards: estypes.ShardStatistics;
}
