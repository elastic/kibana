/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { LegacyFetchHandlers } from '../legacy/types';
import { GetConfigFn } from '../../../types';

/**
 * @internal
 *
 * This type is used when flattenning a SearchSource and passing it down to legacy search.
 * Once legacy search is removed, this type should become internal to `SearchSource`,
 * where `ISearchRequestParams` is used externally instead.
 */
export type SearchRequest = Record<string, any>;

export interface FetchHandlers {
  getConfig: GetConfigFn;
  /**
   * Callback which can be used to hook into responses, modify them, or perform
   * side effects like displaying UI errors on the client.
   */
  onResponse: (request: SearchRequest, response: SearchResponse<any>) => SearchResponse<any>;
  /**
   * These handlers are only used by the legacy defaultSearchStrategy and can be removed
   * once that strategy has been deprecated.
   */
  legacy: LegacyFetchHandlers;
}

export interface SearchError {
  name: string;
  status: string;
  title: string;
  message: string;
  path: string;
  type: string;
}
