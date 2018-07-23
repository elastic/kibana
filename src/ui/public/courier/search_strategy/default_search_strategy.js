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
  const searcRequestsWithFetchParams = [];
  const failedSearchRequests = [];

  // Gather the fetch param responses from all the successful requests.
  fetchParams.forEach((result, index) => {
    if (result.resolved) {
      searcRequestsWithFetchParams.push(result.resolved);
    } else {
      const searchRequest = searchRequests[index];

      // TODO: All strategies will need to implement this.
      searchRequest.handleFailure(result.rejected);
      failedSearchRequests.push(searchRequest);
    }
  });

  return {
    serializedFetchParams: await serializeFetchParams(searcRequestsWithFetchParams),
    failedSearchRequests,
  };
}

export const defaultSearchStrategy = {
  id: 'default',

  search: async ({ searchRequests, es, Promise, serializeFetchParams }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = await getAllFetchParams(searchRequests, Promise);

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const {
      serializedFetchParams,
      failedSearchRequests,
    } = await serializeAllFetchParams(allFetchParams, searchRequests, serializeFetchParams);

    const searching = es.msearch({ body: serializedFetchParams });

    return {
      // Unwrap the responses object returned by the es client.
      searching: searching.then(({ responses }) => responses),
      abort: searching.abort,
      failedSearchRequests,
    };
  },

  // Accept multiple criteria for determining viability to be as flexible as possible.
  isViable: (indexPattern) => {
    if (!indexPattern) {
      return false;
    }

    return isDefaultTypeIndexPattern(indexPattern);
  },
};

addSearchStrategy(defaultSearchStrategy);
