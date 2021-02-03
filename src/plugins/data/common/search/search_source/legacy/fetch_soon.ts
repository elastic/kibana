/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { UI_SETTINGS } from '../../../constants';
import { FetchHandlers, SearchRequest } from '../fetch';
import { ISearchOptions } from '../../index';
import { callClient } from './call_client';

/**
 * This function introduces a slight delay in the request process to allow multiple requests to queue
 * up (e.g. when a dashboard is loading).
 */
export async function fetchSoon(
  request: SearchRequest,
  options: ISearchOptions,
  fetchHandlers: FetchHandlers
) {
  const msToDelay = fetchHandlers.getConfig(UI_SETTINGS.COURIER_BATCH_SEARCHES) ? 50 : 0;
  return delayedFetch(request, options, fetchHandlers, msToDelay);
}

/**
 * Delays executing a function for a given amount of time, and returns a promise that resolves
 * with the result.
 * @param fn The function to invoke
 * @param ms The number of milliseconds to wait
 * @return Promise<any> A promise that resolves with the result of executing the function
 */
function delay<T>(fn: (...args: any) => T, ms: number): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fn()), ms);
  });
}

// The current batch/queue of requests to fetch
let requestsToFetch: SearchRequest[] = [];
let requestOptions: ISearchOptions[] = [];

// The in-progress fetch (if there is one)
let fetchInProgress: any = null;

/**
 * Delay fetching for a given amount of time, while batching up the requests to be fetched.
 * Returns a promise that resolves with the response for the given request.
 * @param request The request to fetch
 * @param ms The number of milliseconds to wait (and batch requests)
 * @return Promise<SearchResponse> The response for the given request
 */
async function delayedFetch(
  request: SearchRequest,
  options: ISearchOptions,
  fetchHandlers: FetchHandlers,
  ms: number
): Promise<SearchResponse<any>> {
  if (ms === 0) {
    return callClient([request], [options], fetchHandlers)[0];
  }

  const i = requestsToFetch.length;
  requestsToFetch = [...requestsToFetch, request];
  requestOptions = [...requestOptions, options];

  // Note: the typescript here only worked because `SearchResponse` was `any`
  // Since this code is legacy, I'm leaving the any here.
  const responses: any[] = await (fetchInProgress =
    fetchInProgress ||
    delay(() => {
      const response = callClient(requestsToFetch, requestOptions, fetchHandlers);
      requestsToFetch = [];
      requestOptions = [];
      fetchInProgress = null;
      return response;
    }, ms));
  return responses[i];
}
