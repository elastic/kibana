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

function serializeAllFetchParams(fetchParams, searchRequests, serializeFetchParams) {
  const requestsWithFetchParams = [];

  // Gather the fetch param responses from all the successful requests.
  fetchParams.forEach((result, index) => {
    if (result.resolved) {
      requestsWithFetchParams.push(result.resolved);
    } else {
      const request = searchRequests[index];
      request.handleFailure(result.rejected);
      searchRequests[index] = undefined;
    }
  });

  return serializeFetchParams(requestsWithFetchParams);
}

export const defaultSearchStrategy = {
  id: 'default',

  search: async ({ searchRequests, es, Promise, serializeFetchParams }) => {
    // Flatten the searchSource within each searchRequest to get the fetch params,
    // e.g. body, filters, index pattern, query.
    const allFetchParams = await getAllFetchParams(searchRequests, Promise);

    // Serialize the fetch params into a format suitable for the body of an ES query.
    const serializedFetchParams = await serializeAllFetchParams(allFetchParams, searchRequests, serializeFetchParams);

    return es.msearch({ body: serializedFetchParams });
  },

  isValidForSearchRequest: searchRequest => {
    // Basic index patterns don't have `type` defined.
    const indexPattern = searchRequest.source.getField('index');
    return indexPattern.type == null;
  },
};
