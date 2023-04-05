/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchSourceSearchOptions } from '../../..';
import { GetConfigFn } from '../../../types';
import { IKibanaSearchResponse } from '../../types';

/**
 * @internal
 *
 * This type is used when flattenning a SearchSource and passing it down to legacy search.
 * Once legacy search is removed, this type should become internal to `SearchSource`,
 * where `ISearchRequestParams` is used externally instead.
 * FIXME: replace with estypes.SearchRequest?
 */
export type SearchRequest = Record<string, any>;

export interface FetchHandlers {
  getConfig: GetConfigFn;
  /**
   * Callback which can be used to hook into responses, modify them, or perform
   * side effects like displaying UI errors on the client.
   */
  onResponse: (
    request: SearchRequest,
    response: IKibanaSearchResponse,
    options: SearchSourceSearchOptions
  ) => IKibanaSearchResponse;
}

export interface SearchError {
  name: string;
  status: string;
  title: string;
  message: string;
  path: string;
  type: string;
}
