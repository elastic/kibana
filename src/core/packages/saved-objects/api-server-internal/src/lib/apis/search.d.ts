/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  SavedObjectsRawDocSource,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
import type { NamespacesBoolFilter } from '../search/search_dsl/query_params';
export interface PerformSearchParams {
  options: SavedObjectsSearchOptions;
}
export declare function performSearch<T extends SavedObjectsRawDocSource, A = unknown>(
  { options }: PerformSearchParams,
  { registry, helpers, serializer, allowedTypes, client, extensions }: ApiExecutionContext
): Promise<SavedObjectsSearchResponse<T, A>>;
export declare function mergeUserQueryWithNamespacesBool(
  userQuery: undefined | estypes.QueryDslQueryContainer,
  namespacesBoolFilter: NamespacesBoolFilter
): estypes.QueryDslQueryContainer;
