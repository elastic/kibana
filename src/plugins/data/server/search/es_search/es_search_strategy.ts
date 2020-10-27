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
import { Logger } from 'kibana/server';
import { Observable } from 'rxjs';
import { switchMap, first, mergeMap } from 'rxjs/operators';

import type { SharedGlobalConfig } from 'kibana/server';

import { SearchUsage } from '../collectors/usage';
import {
  doSearch,
  includeTotalLoaded,
  toKibanaSearchResponse,
} from '../../../common/search/es_search/es_search_rxjs_utils';
import { trackSearchStatus } from './es_search_rxjs_utils';

import { getDefaultSearchParams, getShardTimeout } from '..';
import type { ISearchStrategy } from '..';

export const esSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => ({
  search: (request, { abortSignal }, context) => {
    // Only default index pattern type is supported here.
    // See data_enhanced for other type support.
    if (request.indexType) {
      throw new Error(`Unsupported index pattern type ${request.indexType}`);
    }

    return config$.pipe(
      first(),
      mergeMap(async (config) => ({
        params: {
          ...(await getDefaultSearchParams(context.core.uiSettings.client)),
          ...getShardTimeout(config),
          ...request.params,
        },
      })),
      switchMap(
        doSearch(
          (...args) => context.core.elasticsearch.client.asCurrentUser.search(...args),
          abortSignal
        )
      ),
      toKibanaSearchResponse(),
      trackSearchStatus(logger, usage),
      includeTotalLoaded()
    );
  },
});
