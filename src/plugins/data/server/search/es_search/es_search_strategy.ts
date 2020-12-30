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
import { from, Observable } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import type { SearchResponse } from 'elasticsearch';
import type { Logger, SharedGlobalConfig } from 'kibana/server';
import type { ISearchStrategy } from '../types';
import type { SearchUsage } from '../collectors';
import { getDefaultSearchParams, getShardTimeout, shimAbortSignal } from './request_utils';
import { toKibanaSearchResponse } from './response_utils';
import { searchUsageObserver } from '../collectors/usage';

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => ({
  search: (request, { abortSignal }, { esClient, uiSettingsClient }) => {
    // Only default index pattern type is supported here.
    // See data_enhanced for other type support.
    if (request.indexType) {
      throw new Error(`Unsupported index pattern type ${request.indexType}`);
    }

    const search = async () => {
      const config = await config$.pipe(first()).toPromise();
      const params = {
        ...(await getDefaultSearchParams(uiSettingsClient)),
        ...getShardTimeout(config),
        ...request.params,
      };
      const promise = esClient.asCurrentUser.search<SearchResponse<unknown>>(params);
      const { body } = await shimAbortSignal(promise, abortSignal);
      return toKibanaSearchResponse(body);
    };

    return from(search()).pipe(tap(searchUsageObserver(logger, usage)));
  },
});
