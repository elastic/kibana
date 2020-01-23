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
import { IKibanaSearchRequest, IKibanaSearchResponse } from '../../common/search';
import { ISearchContext } from './i_search_context';
import { ISearch, ISearchOptions } from './i_search';
import { TSearchStrategyProvider, ISearchStrategy } from './i_search_strategy';

export const SYNC_SEARCH_STRATEGY = 'SYNC_SEARCH_STRATEGY';

export interface ISyncSearchRequest extends IKibanaSearchRequest {
  serverStrategy: string;
}

export const syncSearchStrategyProvider: TSearchStrategyProvider<typeof SYNC_SEARCH_STRATEGY> = (
  context: ISearchContext
) => {
  const search: ISearch<typeof SYNC_SEARCH_STRATEGY> = (
    request: ISyncSearchRequest,
    options: ISearchOptions = {}
  ) => {
    const response: Promise<IKibanaSearchResponse> = context.core.http.fetch(
      `/internal/search/${request.serverStrategy}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
        signal: options.signal,
      }
    );

    return from(response);
  };

  const strategy: ISearchStrategy<typeof SYNC_SEARCH_STRATEGY> = {
    search,
  };

  return strategy;
};
