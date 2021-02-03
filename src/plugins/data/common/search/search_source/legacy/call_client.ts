/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { FetchHandlers, SearchRequest } from '../fetch';
import { defaultSearchStrategy } from './default_search_strategy';
import { ISearchOptions } from '../../index';

export function callClient(
  searchRequests: SearchRequest[],
  requestsOptions: ISearchOptions[] = [],
  fetchHandlers: FetchHandlers
) {
  // Correlate the options with the request that they're associated with
  const requestOptionEntries: Array<
    [SearchRequest, ISearchOptions]
  > = searchRequests.map((request, i) => [request, requestsOptions[i]]);
  const requestOptionsMap = new Map<SearchRequest, ISearchOptions>(requestOptionEntries);
  const requestResponseMap = new Map<SearchRequest, Promise<SearchResponse<any>>>();

  const { searching, abort } = defaultSearchStrategy.search({
    searchRequests,
    ...fetchHandlers,
  });

  searchRequests.forEach((request, i) => {
    const response = searching.then((results) => fetchHandlers.onResponse(request, results[i]));
    const { abortSignal = null } = requestOptionsMap.get(request) || {};
    if (abortSignal) abortSignal.addEventListener('abort', abort);
    requestResponseMap.set(request, response);
  });
  return searchRequests.map((request) => requestResponseMap.get(request)!);
}
