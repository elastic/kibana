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

import _ from 'lodash';

import { ErrorAllowExplicitIndexProvider } from '../../error_allow_explicit_index';
import { assignSearchRequestsToSearchStrategies } from '../search_strategy';
import { IsRequestProvider } from './is_request';
import { MergeDuplicatesRequestProvider } from './merge_duplicate_requests';
import { RequestStatus } from './req_status';
import { SerializeFetchParamsProvider } from './request/serialize_fetch_params';

export function CallClientProvider(Private, Promise, es) {
  const errorAllowExplicitIndex = Private(ErrorAllowExplicitIndexProvider);
  const isRequest = Private(IsRequestProvider);
  const mergeDuplicateRequests = Private(MergeDuplicatesRequestProvider);
  const serializeFetchParams = Private(SerializeFetchParamsProvider);

  const ABORTED = RequestStatus.ABORTED;
  const DUPLICATE = RequestStatus.DUPLICATE;

  function callClient(searchRequests) {
    // merging docs can change status to DUPLICATE, capture new statuses
    const statuses = mergeDuplicateRequests(searchRequests);

    // get the actual list of requests that we will be fetching
    const requestsToFetch = statuses.filter(isRequest);
    let execCount = requestsToFetch.length;

    if (!execCount) {
      return Promise.resolve([]);
    }

    // This is how we'll provide the consumer with search responses.
    const defer = Promise.defer();

    const searchStrategiesWithRequests = assignSearchRequestsToSearchStrategies(requestsToFetch);

    // resolved by respondToSearchRequests()
    let esPromise = undefined;
    let isRequestAborted = false;

    // for each respond with either the response or ABORTED
    const respondToSearchRequests = (responses = []) => {
      const aggregatedSearchRequests = searchStrategiesWithRequests.reduce((allSearchRequests, { searchRequests }) => {
        return allSearchRequests.concat(searchRequests);
      }, []);

      const activeSearchRequests = aggregatedSearchRequests.filter(request => {
        // We'll use the index of the request to map it to its response. If a request has already
        // failed then it won't generate a response. In this case we need to remove the request
        // to maintain cardinality between the list of requests and the list of corresponding
        // responses.
        return request !== undefined;
      });

      return Promise.map(activeSearchRequests, function (searchRequest, searchRequestIndex) {
        const status = statuses[searchRequestIndex];

        if (status === ABORTED) {
          return ABORTED;
        }

        if (status === DUPLICATE) {
          return searchRequest._uniq.resp;
        }

        const index = _.findIndex(activeSearchRequests, searchRequest);

        if (index < 0) {
          // This means the searchRequest failed.
          return ABORTED;
        }

        return responses[index];
      })
        .then(
          (res) => defer.resolve(res),
          (err) => defer.reject(err)
        );
    };

    // handle a request being aborted while being fetched
    const requestWasAborted = Promise.method(function (req, i) {
      if (statuses[i] === ABORTED) {
        defer.reject(new Error('Request was aborted twice?'));
      }

      execCount -= 1;
      if (execCount > 0) {
        // the multi-request still contains other requests
        return;
      }

      if (esPromise && _.isFunction(esPromise.abort)) {
        esPromise.abort();
      }

      esPromise = undefined;
      isRequestAborted = true;

      return respondToSearchRequests();
    });

    // attach abort handlers, close over request index
    statuses.forEach(function (req, i) {
      if (!isRequest(req)) return;
      req.whenAborted(function () {
        requestWasAborted(req, i).catch(defer.reject);
      });
    });

    // We're going to create a new async context here, so that the logic within it can execute
    // asynchronously after we've returned a reference to defer.promise.
    Promise.resolve().then(async () => {
      // Execute each request using its search strategy.
      const esPromises = searchStrategiesWithRequests.map(searchStrategyWithSearchRequests => {
        const { searchStrategy, searchRequests } = searchStrategyWithSearchRequests;
        return searchStrategy.search({ searchRequests, es, Promise, serializeFetchParams });
      });

      try {
        // The request was aborted while we were doing the above logic.
        if (isRequestAborted) {
          return await respondToSearchRequests();
        }

        esPromise = Promise.all(esPromises);
        const segregatedResponses = await esPromise;

        // Aggregate the responses returned by all of the search strategies.
        const aggregatedResponses = segregatedResponses.reduce((aggregation, responses) => {
          return aggregation.concat(responses.responses);
        }, []);

        await respondToSearchRequests(aggregatedResponses);
      } catch(error) {
        if (errorAllowExplicitIndex.test(error)) {
          return errorAllowExplicitIndex.takeover();
        }

        defer.reject(error);
      }
    });

    // If there are any errors, notify the searchRequests of them.
    defer.promise.catch((err) => {
      searchRequests.forEach((searchRequest, index) => {
        if (statuses[index] !== ABORTED) {
          searchRequest.handleFailure(err);
        }
      });
    });

    // Return the promise which acts as our vehicle for providing search responses to the consumer.
    return defer.promise;
  }

  return callClient;
}
