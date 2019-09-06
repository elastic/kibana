/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TimeRange } from 'src/plugins/data/public';
import { Query } from 'src/legacy/core_plugins/data/public';
import { Filter } from '@kbn/es-query';
import { AggConfigs } from 'ui/vis/agg_configs';
import { SearchSource } from '../../courier';
import { QueryFilter } from '../../filter_manager/query_filter';
import { Adapters } from '../../inspector/types';
import { PersistedState } from '../../persisted_state';

export interface RequestHandlerParams {
  searchSource: SearchSource;
  aggs: AggConfigs;
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  forceFetch: boolean;
  queryFilter: QueryFilter;
  uiState?: PersistedState;
  partialRows?: boolean;
  inspectorAdapters?: Adapters;
  metricsAtAllLevels?: boolean;
  visParams?: any;
  abortSignal?: AbortSignal;
}

export type RequestHandler<T = unknown> = (params: RequestHandlerParams) => T;

export interface RequestHandlerDescription {
  name: string;
  handler: RequestHandler;
}
