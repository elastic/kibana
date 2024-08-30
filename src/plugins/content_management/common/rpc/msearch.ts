/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Version } from '@kbn/object-versioning';
import { SearchQuery, SearchResult } from './search';

export type MSearchQuery = SearchQuery;

export interface MSearchIn {
  contentTypes: Array<{ contentTypeId: string; version?: Version }>;
  query: MSearchQuery;
}

export type MSearchResult<T = unknown> = SearchResult<T>;

export interface MSearchOut<T = unknown> {
  contentTypes: Array<{ contentTypeId: string; version?: Version }>;
  result: MSearchResult<T>;
}
