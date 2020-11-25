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

import { from } from 'rxjs';
import { map } from 'rxjs/operators';

import type { SearchResponse } from 'elasticsearch';
import type { ApiResponse } from '@elastic/elasticsearch';

import { shimAbortSignal } from './shim_abort_signal';
import { getTotalLoaded } from './get_total_loaded';

import type { IEsRawSearchResponse } from './types';
import type { IKibanaSearchResponse } from '../types';

export const doSearch = <SearchResponse = any>(
  searchMethod: () => Promise<SearchResponse>,
  abortSignal?: AbortSignal
) => from(shimAbortSignal(searchMethod(), abortSignal));

export const toKibanaSearchResponse = <
  SearchResponse extends IEsRawSearchResponse = IEsRawSearchResponse,
  KibanaResponse extends IKibanaSearchResponse = IKibanaSearchResponse<SearchResponse>
>() =>
  map<ApiResponse<SearchResponse>, KibanaResponse>(
    (response) =>
      ({
        id: response.body.id,
        isPartial: response.body.is_partial || false,
        isRunning: response.body.is_running || false,
        rawResponse: response.body,
      } as KibanaResponse)
  );

export const includeTotalLoaded = () =>
  map((response: IKibanaSearchResponse<SearchResponse<unknown>>) => ({
    ...response,
    ...getTotalLoaded(response.rawResponse._shards),
  }));
