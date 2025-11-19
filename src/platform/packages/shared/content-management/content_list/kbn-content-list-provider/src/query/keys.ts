/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FindItemsParams } from '../datasource';

/**
 * Query keys for content list items.
 * Includes entity name and optional scope in keys to prevent cache collisions.
 *
 * Use these keys for manual cache invalidation or prefetching with React Query.
 *
 * @example
 * ```ts
 * // Invalidate all content list queries for dashboards.
 * queryClient.invalidateQueries(contentListKeys.all('dashboard'));
 *
 * // Invalidate queries for a specific scope.
 * queryClient.invalidateQueries(contentListKeys.all('dashboard', 'my-scope'));
 *
 * // Invalidate a specific query.
 * queryClient.invalidateQueries(contentListKeys.items('dashboard', undefined, params));
 * ```
 */
export const contentListKeys = {
  /**
   * Base query key for all content list queries.
   * @param entityName - Optional entity name for scoping (e.g., "dashboard").
   * @param queryKeyScope - Optional scope for cache isolation between lists with same entityName.
   */
  all: (entityName?: string, queryKeyScope?: string) => {
    const base = ['content-list'] as const;
    if (entityName && queryKeyScope) {
      return [...base, entityName, queryKeyScope] as const;
    }
    if (entityName) {
      return [...base, entityName] as const;
    }
    return base;
  },
  /**
   * Query key for items queries with specific parameters.
   * @param entityName - Optional entity name for scoping.
   * @param queryKeyScope - Optional scope for cache isolation.
   * @param params - Query parameters (search, filters, sort, page).
   */
  items: (
    entityName: string | undefined,
    queryKeyScope: string | undefined,
    params: Omit<FindItemsParams, 'signal'>
  ) => [...contentListKeys.all(entityName, queryKeyScope), 'items', params] as const,
};
