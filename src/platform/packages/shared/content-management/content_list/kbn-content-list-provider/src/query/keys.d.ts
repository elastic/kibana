/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FindItemsParams, ActiveFilters } from '../datasource';
/**
 * Query keys for content list items.
 *
 * Uses `queryKeyScope` (a stable identifier) to prevent cache collisions.
 * Intentionally does not use user-facing labels (which may be i18n-translated)
 * to ensure cache stability across locales.
 *
 * @example
 * ```ts
 * // Invalidate all content list queries for a specific scope.
 * queryClient.invalidateQueries(contentListKeys.all('dashboard-listing'));
 * ```
 */
export declare const contentListKeys: {
  /**
   * Base query key for all content list queries.
   *
   * @param queryKeyScope - Stable scope identifier for cache isolation.
   */
  all: (queryKeyScope: string) => readonly ['content-list', string];
  /**
   * Query key for items queries with specific parameters.
   *
   * @param queryKeyScope - Stable scope identifier for cache isolation.
   * @param params - Query parameters (search, filters, sort, page).
   */
  items: (
    queryKeyScope: string,
    params: Omit<FindItemsParams, 'signal'>
  ) => readonly ['content-list', string, 'items', Omit<FindItemsParams, 'signal'>];
  /**
   * Query key for the shared user profile cache.
   *
   * @param queryKeyScope - Stable scope identifier for cache isolation.
   */
  profiles: (queryKeyScope: string) => readonly ['content-list', string, 'user-profiles'];
  /**
   * Query key for filter facets (popover options with counts).
   *
   * @param queryKeyScope - Stable scope identifier for cache isolation.
   * @param filterId - Filter dimension key (e.g. `'createdBy'`, `'tag'`).
   * @param filters - Active filters excluding the filter being fetched.
   */
  filterFacets: (
    queryKeyScope: string,
    filterId: string,
    filters: ActiveFilters
  ) => readonly ['content-list', string, 'filterFacets', string, ActiveFilters];
};
