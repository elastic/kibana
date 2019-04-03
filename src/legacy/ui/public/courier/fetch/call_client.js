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

import { uniq } from 'lodash';
import { ErrorAllowExplicitIndexProvider } from '../../error_allow_explicit_index';
import { getSearchStrategyForSearchRequest } from '../search_strategy';
import { SerializeFetchParamsProvider } from './request/serialize_fetch_params';

export function CallClientProvider(Private, Promise, es, config) {
  const errorAllowExplicitIndex = Private(ErrorAllowExplicitIndexProvider);
  const serializeFetchParams = Private(SerializeFetchParamsProvider);

  return async function callClient(searchRequests) {
    if (searchRequests.length === 0) {
      return [];
    }

    const maxConcurrentShardRequests = config.get('courier:maxConcurrentShardRequests');
    const includeFrozen = config.get('search:includeFrozen');

    try {
      // Look up the search strategy per request
      const searchStrategies = searchRequests.map(getSearchStrategyForSearchRequest);

      // A map to correlate the original request with its response
      const requestResponseMap = new Map();

      // For each unique search strategy, execute the strategy with the matching requests
      await Promise.all(uniq(searchStrategies).map(async searchStrategy => {
        const requests = searchRequests.filter((_, i) => searchStrategy === searchStrategies[i]);
        const { searching } = await searchStrategy.search({
          searchRequests: requests,
          es,
          Promise,
          serializeFetchParams,
          includeFrozen,
          maxConcurrentShardRequests
        });

        // The list of responses for this strategy
        const responses = await searching;

        // Correlate the response with the original request
        responses.forEach((response, i) => requestResponseMap.set(requests[i], response));
      }));

      // Return the responses in the order of the original requests
      return searchRequests.map(request => requestResponseMap.get(request));
    } catch (error) {
      if (errorAllowExplicitIndex.test(error)) {
        return errorAllowExplicitIndex.takeover();
      }

      // By returning the return value of this catch() without rethrowing the error, we delegate
      // error-handling to the searchRequest instead of the consumer.
      searchRequests.forEach(searchRequest => searchRequest.handleFailure(error));
    }
  };
}
