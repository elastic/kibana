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

import { addSearchStrategy } from './search_strategy_registry';
import { isDefaultTypeIndexPattern } from './is_default_type_index_pattern';
import { SearchError } from './search_error';

function getAllFetchParams(searchRequests, Promise) {
  return Promise.map(searchRequests, (searchRequest) => {
    return Promise.try(searchRequest.getFetchParams, void 0, searchRequest)
      .then((fetchParams) => {
        return (searchRequest.fetchParams = fetchParams);
      })
      .then(value => ({ resolved: value }))
      .catch(error => ({ rejected: error }));
  });
}

async function serializeAllFetchParams(fetchParams, searchRequests, serializeFetchParams) {
  const searchRequestsWithFetchParams = [];
  const failedSearchRequests = [];

  // Gather the fetch param responses from all the successful requests.
  fetchParams.forEach((result, index) => {
    if (result.resolved) {
      searchRequestsWithFetchParams.push(result.resolved);
    } else {
      const searchRequest = searchRequests[index];

      searchRequest.handleFailure(result.rejected);
      failedSearchRequests.push(searchRequest);
    }
  });

  return {
    serializedFetchParams: await serializeFetchParams(searchRequestsWithFetchParams),
    failedSearchRequests,
  };
}

export const defaultSearchStrategy = {
  id: 'default',

  search: async ({ searchRequests, es, Promise, serializeFetchParams, includeFrozen = false, maxConcurrentShardRequests = 0 }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = await getAllFetchParams(searchRequests, Promise);

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const {
      serializedFetchParams,
      failedSearchRequests,
    } = await serializeAllFetchParams(allFetchParams, searchRequests, serializeFetchParams);

    const msearchParams = {
      rest_total_hits_as_int: true,
      // If we want to include frozen indexes we need to specify ignore_throttled: false
      ignore_throttled: !includeFrozen,
      body: serializedFetchParams,
    };

    if (maxConcurrentShardRequests !== 0) {
      msearchParams.max_concurrent_shard_requests = maxConcurrentShardRequests;
    }

    const searching = es.msearch(msearchParams);

    return {
      // Munge data into shape expected by consumer.
      searching: new Promise((resolve, reject) => {
        // Unwrap the responses object returned by the ES client.
        searching.then(({ responses }) => {
          resolve(responses);
        }).catch(error => {
          // Format ES client error as a SearchError.
          const { statusCode, displayName, message, path } = error;

          const searchError = new SearchError({
            status: statusCode,
            title: displayName,
            message,
            path,
          });

          reject(searchError);
        });
      }),
      abort: searching.abort,
      failedSearchRequests,
    };
  },

  isViable: (indexPattern) => {
    if (!indexPattern) {
      return false;
    }

    return isDefaultTypeIndexPattern(indexPattern);
  },
};

addSearchStrategy(defaultSearchStrategy);
