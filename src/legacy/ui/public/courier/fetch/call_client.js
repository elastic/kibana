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

import { ErrorAllowExplicitIndexProvider } from '../../error_allow_explicit_index';
import { assignSearchRequestsToSearchStrategies } from '../search_strategy';
import { IsRequestProvider } from './is_request';
import { RequestStatus } from './req_status';
import { SerializeFetchParamsProvider } from './request/serialize_fetch_params';
import { i18n } from '@kbn/i18n';

export function CallClientProvider(Private, Promise, es, config) {
  const errorAllowExplicitIndex = Private(ErrorAllowExplicitIndexProvider);
  const isRequest = Private(IsRequestProvider);
  const serializeFetchParams = Private(SerializeFetchParamsProvider);

  const ABORTED = RequestStatus.ABORTED;

  function callClient(searchRequests) {
    const maxConcurrentShardRequests = config.get('courier:maxConcurrentShardRequests');
    const includeFrozen = config.get('search:includeFrozen');

    // get the actual list of requests that we will be fetching
    const requestsToFetch = searchRequests.filter(isRequest);
    let requestsToFetchCount = requestsToFetch.length;

    if (requestsToFetchCount === 0) {
      return Promise.resolve([]);
    }

    // This is how we'll provide the consumer with search responses. Resolved by
    // respondToSearchRequests.
    const defer = Promise.defer();

    const abortableSearches = [];
    let areAllSearchRequestsAborted = false;

    // When we traverse our search requests and send out searches, some of them may fail. We'll
    // store those that don't fail here.
    const activeSearchRequests = [];

    // Respond to each searchRequest with the response or ABORTED.
    const respondToSearchRequests = (responsesInOriginalRequestOrder = []) => {
      // We map over searchRequests because if we were originally provided an ABORTED
      // request then we'll return that value.
      return Promise.map(searchRequests, function (searchRequest, searchRequestIndex) {
        if (searchRequest.aborted) {
          return ABORTED;
        }

        const status = searchRequests[searchRequestIndex];

        if (status === ABORTED) {
          return ABORTED;
        }

        const activeSearchRequestIndex = activeSearchRequests.indexOf(searchRequest);
        const isFailedSearchRequest = activeSearchRequestIndex === -1;

        if (isFailedSearchRequest) {
          return ABORTED;
        }

        return responsesInOriginalRequestOrder[searchRequestIndex];
      })
        .then(
          (res) => defer.resolve(res),
          (err) => defer.reject(err)
        );
    };

    // handle a request being aborted while being fetched
    const requestWasAborted = Promise.method(function (searchRequest, index) {
      if (searchRequests[index] === ABORTED) {
        defer.reject(new Error(
          i18n.translate('common.ui.courier.fetch.requestWasAbortedTwiceErrorMessage', {
            defaultMessage: 'Request was aborted twice?',
          })
        ));
      }

      requestsToFetchCount--;

      if (requestsToFetchCount !== 0) {
        // We can't resolve early unless all searchRequests have been aborted.
        return;
      }

      abortableSearches.forEach(({ abort }) => {
        abort();
      });

      areAllSearchRequestsAborted = true;

      return respondToSearchRequests();
    });

    // attach abort handlers, close over request index
    searchRequests.forEach(function (searchRequest, index) {
      if (!isRequest(searchRequest)) {
        return;
      }

      searchRequest.whenAborted(function () {
        requestWasAborted(searchRequest, index).catch(defer.reject);
      });
    });

    const searchStrategiesWithRequests = assignSearchRequestsToSearchStrategies(requestsToFetch);

    // We're going to create a new async context here, so that the logic within it can execute
    // asynchronously after we've returned a reference to defer.promise.
    Promise.resolve().then(async () => {
      // Execute each request using its search strategy.
      for (let i = 0; i < searchStrategiesWithRequests.length; i++) {
        const searchStrategyWithSearchRequests = searchStrategiesWithRequests[i];
        const { searchStrategy, searchRequests } = searchStrategyWithSearchRequests;
        const {
          searching,
          abort,
          failedSearchRequests,
        } = await searchStrategy.search({ searchRequests, es, Promise, serializeFetchParams, includeFrozen, maxConcurrentShardRequests });

        // Collect searchRequests which have successfully been sent.
        searchRequests.forEach(searchRequest => {
          if (failedSearchRequests.includes(searchRequest)) {
            return;
          }

          activeSearchRequests.push(searchRequest);
        });

        abortableSearches.push({
          searching,
          abort,
          requestsCount: searchRequests.length,
        });
      }

      try {
        // The request was aborted while we were doing the above logic.
        if (areAllSearchRequestsAborted) {
          return;
        }

        const segregatedResponses = await Promise.all(abortableSearches.map(async ({ searching, requestsCount }) => {
          return searching.catch((e) => {
            // Duplicate errors so that they correspond to the original requests.
            return new Array(requestsCount).fill({ error: e });
          });
        }));

        // Assigning searchRequests to strategies means that the responses come back in a different
        // order than the original searchRequests. So we'll put them back in order so that we can
        // use the order to associate each response with the original request.
        const responsesInOriginalRequestOrder = new Array(searchRequests.length);
        segregatedResponses.forEach((responses, strategyIndex) => {
          responses.forEach((response, responseIndex) => {
            const searchRequest = searchStrategiesWithRequests[strategyIndex].searchRequests[responseIndex];
            const requestIndex = searchRequests.indexOf(searchRequest);
            responsesInOriginalRequestOrder[requestIndex] = response;
          });
        });

        await respondToSearchRequests(responsesInOriginalRequestOrder);
      } catch(error) {
        if (errorAllowExplicitIndex.test(error)) {
          return errorAllowExplicitIndex.takeover();
        }

        defer.reject(error);
      }
    });

    // Return the promise which acts as our vehicle for providing search responses to the consumer.
    // However, if there are any errors, notify the searchRequests of them *instead* of bubbling
    // them up to the consumer.
    return defer.promise.catch((err) => {
      // By returning the return value of this catch() without rethrowing the error, we delegate
      // error-handling to the searchRequest instead of the consumer.
      searchRequests.forEach((searchRequest, index) => {
        if (searchRequests[index] !== ABORTED) {
          searchRequest.handleFailure(err);
        }
      });
    });
  }

  return callClient;
}
