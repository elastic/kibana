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

import { GetConfigFn } from '../../../common';
import { ISearchStartLegacy } from '../types';

/**
 * @internal
 *
 * This type is used when flattenning a SearchSource and passing it down to legacy search.
 * Once legacy search is removed, this type should become internal to `SearchSource`,
 * where `ISearchRequestParams` is used externally instead.
 */
export type SearchRequest = Record<string, any>;

export interface FetchOptions {
  abortSignal?: AbortSignal;
  searchStrategyId?: string;
}

export interface FetchHandlers {
  legacySearchService: ISearchStartLegacy;
  config: { get: GetConfigFn };
  esShardTimeout: number;
}

export interface SearchError {
  name: string;
  status: string;
  title: string;
  message: string;
  path: string;
  type: string;
}
