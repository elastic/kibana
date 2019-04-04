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

import { fatalError } from '../../notify';
import { CallClientProvider } from './call_client';
import { callResponseHandlers } from './call_response_handlers';

/**
 * Fetch now provider should be used if you want the results searched and returned immediately.
 * This can be slightly inefficient if a large number of requests are queued up, we can batch these
 * by using fetchSoon. This introduces a slight delay which allows other requests to queue up before
 * sending out requests in a batch.
 *
 * @param Private
 * @return {fetchNow}
 * @constructor
 */
export function FetchNowProvider(Private) {
  // core tasks
  const callClient = Private(CallClientProvider);

  return async function fetchNow(searchRequests) {
    try {
      return await fetchSearchResults(searchRequests);
    } catch (e) {
      // If any errors occur after the search requests have resolved, then we kill Kibana.
      fatalError(e, 'Courier fetch');
    }
  };

  async function fetchSearchResults(searchRequests) {
    await startRequests(searchRequests);
    try {
      const responses = await callClient(searchRequests);
      return callResponseHandlers(searchRequests, responses);
    } catch (e) {
      // Silently swallow errors that result from search requests so the consumer can surface
      // them as notifications instead of courier forcing fatal errors.
    }
  }

  function startRequests(searchRequests) {
    return Promise.all(searchRequests.map(async searchRequest => {
      try {
        searchRequest.start();
      } catch (e) {
        searchRequest.handleFailure(e);
      }
    }));
  }
}
