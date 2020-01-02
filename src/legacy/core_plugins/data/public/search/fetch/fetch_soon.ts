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

import { callClient } from './call_client';
import { FetchHandlers, FetchOptions } from './types';
import { SearchRequest, SearchResponse } from '../types';

/**
 * This function introduces a slight delay in the request process to allow multiple requests to queue
 * up (e.g. when a dashboard is loading).
 */
export async function fetchSoon(
  request: SearchRequest,
  options: FetchOptions,
  { searchService, config, esShardTimeout }: FetchHandlers
) {
  return delayedFetch(request, options, { searchService, config, esShardTimeout }, 0);
}

/**
 * Delays executing a function for a given amount of time, and returns a promise that resolves
 * with the result.
 * @param fn The function to invoke
 * @param ms The number of milliseconds to wait
 * @return Promise<any> A promise that resolves with the result of executing the function
 */
function delay(fn: Function, ms: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(fn()), ms);
  });
}

// The current batch/queue of requests to fetch
let requestsToFetch: SearchRequest[] = [];
let requestOptions: FetchOptions[] = [];

// The in-progress fetch (if there is one)
let fetchInProgress: Promise<SearchResponse> | null = null;

/**
 * Delay fetching for a given amount of time, while batching up the requests to be fetched.
 * Returns a promise that resolves with the response for the given request.
 * @param request The request to fetch
 * @param ms The number of milliseconds to wait (and batch requests)
 * @return Promise<SearchResponse> The response for the given request
 */
async function delayedFetch(
  request: SearchRequest,
  options: FetchOptions,
  { searchService, config, esShardTimeout }: FetchHandlers,
  ms: number
) {
  const i = requestsToFetch.length;
  requestsToFetch = [...requestsToFetch, request];
  requestOptions = [...requestOptions, options];
  const responses = await (fetchInProgress =
    fetchInProgress ||
    delay(() => {
      const response = callClient(requestsToFetch, requestOptions, {
        searchService,
        config,
        esShardTimeout,
      });
      requestsToFetch = [];
      requestOptions = [];
      fetchInProgress = null;
      return response;
    }, ms));
  return responses[i];
}
