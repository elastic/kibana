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
import { CallClientProvider } from './call_client';
import { callResponseHandlers } from './call_response_handlers';

/**
 * This is usually the right fetch provider to use, rather than FetchNowProvider, as this function introduces
 * a slight delay in the request process to allow multiple requests to queue up (e.g. when a dashboard
 * is loading).
 */
export function FetchSoonProvider(Private) {
  const fetchNow = Private(FetchNowProvider);
  let requestsToFetch = [];

  const debouncedFetchNow = _.debounce(() => {
    fetchNow(requestsToFetch);
    requestsToFetch = [];
  }, {
    wait: 10,
    maxWait: 50
  });

  /**
   * Adds the given request to the array of requests to fetch, and makes a debounced call to
   * fetchNow, then returns the promise from the request (which will resolve with the response or
   * reject with an error)
   * @param {SearchRequest} request
   */
  return function fetchSoon(request) {
    requestsToFetch = [...requestsToFetch, request];
    debouncedFetchNow(requestsToFetch);
    return request.getPromise();
  };
}

/**
 * Fetch now provider should be used if you want the results searched and returned immediately.
 * This can be slightly inefficient if a large number of requests are queued up, we can batch these
 * by using fetchSoon.
 */
export function FetchNowProvider(Private) {
  const callClient = Private(CallClientProvider);

  return async function fetchNow(searchRequests) {
    try {
      const responses = await callClient(searchRequests);
      return responses && callResponseHandlers(searchRequests, responses);
    } catch (e) {
      // Silently swallow errors that result from search requests so the consumer can surface
      // them as notifications instead of courier forcing fatal errors.
    }
  };
}
