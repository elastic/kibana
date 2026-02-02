/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FindItemsFn, FindItemsParams, FindItemsResult } from '@kbn/content-list-provider';

/**
 * Reference type matching `SavedObjectsFindOptionsReference` from Kibana core.
 */
export interface SavedObjectReference {
  type: string;
  id: string;
  name?: string;
}

/**
 * The existing `TableListView` `findItems` signature that consumers already have.
 *
 * This matches the signature expected by `TableListViewTableProps.findItems`.
 */
export type TableListViewFindItemsFn<T> = (
  searchQuery: string,
  refs?: {
    references?: SavedObjectReference[];
    referencesToExclude?: SavedObjectReference[];
  }
) => Promise<{ total: number; hits: T[] }>;

/**
 * Options for creating a find items adapter.
 *
 * @template T The item type returned by the consumer's `findItems` function.
 */
export interface CreateFindItemsAdapterOptions<T> {
  /**
   * The consumer's existing `findItems` function (same signature as `TableListView`).
   */
  findItems: TableListViewFindItemsFn<T>;
}

/**
 * Result of creating a find items adapter.
 *
 * @template T The item type.
 */
export interface CreateFindItemsAdapterResult<T> {
  /** The adapted find items function compatible with `ContentListProvider`. */
  findItems: FindItemsFn<T>;
  /** Clears the adapter's internal cache. */
  clearCache: () => void;
}

/**
 * Creates an adapter that wraps a `TableListView`-style `findItems` function.
 *
 * This adapter:
 * - Translates between the old and new API signatures.
 * - Caches the full result set for client-side sorting and pagination.
 *
 * @template T The item type (must extend `UserContentCommonSchema`).
 * @param options - Configuration options including the `findItems` function.
 * @returns The adapted `findItems` function and `clearCache` utility.
 */
export const createFindItemsAdapter = <T extends UserContentCommonSchema>(
  options: CreateFindItemsAdapterOptions<T>
): CreateFindItemsAdapterResult<T> => {
  const { findItems: consumerFindItems } = options;

  // Cache for the full result set.
  let cachedResult: { items: T[]; total: number } | null = null;
  let lastCacheKey: string | null = null;

  /**
   * Builds a stable cache key from query parameters.
   * Only includes `searchQuery` and `filters.search` since sort/page are handled client-side.
   */
  const buildCacheKey = ({ searchQuery, filters }: FindItemsParams): string =>
    JSON.stringify([searchQuery, filters.search ?? '']);

  /**
   * Applies client-side sorting and pagination on top of the cached full result set.
   */
  const applySortingAndPagination = (
    params: FindItemsParams,
    cached: { items: T[]; total: number }
  ): FindItemsResult<T> => {
    const {
      sort,
      page: { index, size },
    } = params;

    const { total } = cached;
    const sortedItems = [...cached.items];

    if (sort && sort.field) {
      const { field, direction } = sort;
      sortedItems.sort((a, b) => {
        const aValue = a[field as keyof T];
        const bValue = b[field as keyof T];

        // Always place null/undefined values after defined values, regardless of sort direction.
        // This matches the legacy TableListView behavior of treating nulls as "last" in the list.
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        return 0;
      });
    }

    const start = index * size;
    const end = start + size;
    const pageItems = sortedItems.slice(start, end);

    return {
      total,
      items: pageItems,
    };
  };

  const findItems: FindItemsFn<T> = async (
    params: FindItemsParams
  ): Promise<FindItemsResult<T>> => {
    const { searchQuery } = params;
    const cacheKey = buildCacheKey(params);

    // Check if we can use (and transform) the cached result.
    if (cachedResult && lastCacheKey === cacheKey) {
      return applySortingAndPagination(params, cachedResult);
    }

    // Fetch fresh data from the consumer's `findItems`.
    const result = await consumerFindItems(searchQuery);

    // Cache the full, unpaginated result.
    cachedResult = { items: result.hits, total: result.total };
    lastCacheKey = cacheKey;

    return applySortingAndPagination(params, cachedResult);
  };

  const clearCache = () => {
    cachedResult = null;
    lastCacheKey = null;
  };

  return { findItems, clearCache };
};
