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

import { groupBy } from 'lodash';
import { getSearchStrategyForSearchRequest, getSearchStrategyById } from '../search_strategy';
import { handleResponse } from './handle_response';
import { FetchOptions, FetchHandlers } from './types';
import { SearchRequest } from '../types';

export function callClient(
  searchRequests: SearchRequest[],
  requestsOptions: FetchOptions[] = [],
  { searchService, config, esShardTimeout }: FetchHandlers
) {
  // Correlate the options with the request that they're associated with
  const requestOptionEntries: Array<[
    SearchRequest,
    FetchOptions
  ]> = searchRequests.map((request, i) => [request, requestsOptions[i]]);
  const requestOptionsMap = new Map<SearchRequest, FetchOptions>(requestOptionEntries);

  // Group the requests by the strategy used to search that specific request
  const searchStrategyMap = groupBy(searchRequests, (request, i) => {
    const searchStrategy = getSearchStrategyForSearchRequest(request, requestsOptions[i]);
    return searchStrategy.id;
  });

  // Execute each search strategy with the group of requests, but return the responses in the same
  // order in which they were received. We use a map to correlate the original request with its
  // response.
  const requestResponseMap = new Map();
  Object.keys(searchStrategyMap).forEach(searchStrategyId => {
    const searchStrategy = getSearchStrategyById(searchStrategyId);
    const requests = searchStrategyMap[searchStrategyId];

    // There's no way `searchStrategy` could be undefined here because if we didn't get a matching strategy for this ID
    // then an error would have been thrown above
    const { searching, abort } = searchStrategy!.search({
      searchRequests: requests,
      searchService,
      config,
      esShardTimeout,
    });

    requests.forEach((request, i) => {
      const response = searching.then(results => handleResponse(request, results[i]));
      const { abortSignal = null } = requestOptionsMap.get(request) || {};
      if (abortSignal) abortSignal.addEventListener('abort', abort);
      requestResponseMap.set(request, response);
    });
  }, []);
  return searchRequests.map(request => requestResponseMap.get(request));
}
