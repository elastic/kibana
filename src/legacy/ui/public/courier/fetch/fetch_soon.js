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
import { FetchNowProvider } from './fetch_now';

/**
 * This is usually the right fetch provider to use, rather than FetchNowProvider, as this class introduces
 * a slight delay in the request process to allow multiple requests to queue up (e.g. when a dashboard
 * is loading).
 *
 * @param Private
 * @param Promise
 * @constructor
 */
export function FetchSoonProvider(Private) {

  const fetchNow = Private(FetchNowProvider);
  let requestsToFetch = [];

  const debouncedFetchNow = _.debounce(async () => {
    try {
      await fetchNow(requestsToFetch);
    } finally {
      requestsToFetch = [];
    }
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
