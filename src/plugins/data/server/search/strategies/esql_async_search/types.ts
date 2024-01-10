/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AsyncSearchGetRequest, ShardStatistics } from '@elastic/elasticsearch/lib/api/types';
import { ISearchRequestParams } from '../../../../common';

export interface IAsyncSearchRequestParams extends ISearchRequestParams {
  keep_alive?: AsyncSearchGetRequest['keep_alive'];
  wait_for_completion_timeout?: AsyncSearchGetRequest['wait_for_completion_timeout'];
}

export interface EsqlAsyncSearchResponse {
  id?: string;
  values: unknown;
  columns: unknown;
  is_partial: boolean;
  is_running: boolean;
}
export interface AsyncSearchStatusResponse extends Omit<EsqlAsyncSearchResponse, 'response'> {
  completion_status: number;
  _shards: ShardStatistics;
}
