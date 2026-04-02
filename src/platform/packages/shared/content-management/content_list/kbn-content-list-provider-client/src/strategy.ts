/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ActiveFilters,
  IncludeExcludeFilter,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  ContentListItem,
} from '@kbn/content-list-provider';
import { TAG_FILTER_ID } from '@kbn/content-list-provider';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type { TableListViewFindItemsFn } from './types';

export const MANAGED_USER_FILTER = '__managed__';
export const NO_CREATOR_USER_FILTER = '__no_creator__';

/**
 * Return type from {@link createClientStrategy}.
 */
export interface ClientStrategy {
  /**
   * Fetches items and applies client-side filtering, sorting, and pagination.
   *
   * Internally caches the server response keyed by `searchQuery`. Calls to
   * `findItems` with the same `searchQuery` reuse the cache and only
   * recompute the client-side transforms. A new `searchQuery` triggers a
   * fresh server fetch.
   *
   * The core provider calls {@link ClientStrategy.onInvalidate} before
   * refetching after mutations so the next call always hits the server.
   */
  findItems: FindItemsFn;
  /**
   * Called by the core provider before an explicit refetch (e.g. after a
   * mutation) to clear the internal item cache. The next `findItems` call
   * will fetch from the server regardless of `searchQuery`.
   */
  onInvalidate: () => void;
  /** Returns the full (unfiltered) item set from the most recent server fetch. */
  getItems: () => UserContentCommonSchema[];
}

/**
 * Safely retrieves a sortable value from an object by key.
 *
 * Returns `null` if the key doesn't exist or the value isn't a sortable type.
 */
const getSortableProperty = (obj: object | undefined, key: string): string | number | null => {
  if (!obj || !(key in obj)) {
    return null;
  }
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
};

/**
 * Gets the value of a field from a `UserContentCommonSchema` item for sorting.
 *
 * Handles the nested `attributes` structure and provides a fallback chain:
 * 1. Known fields (`title`, `description`, `updatedAt`, `createdAt`).
 * 2. Top-level item fields (`id`, `type`, etc.).
 * 3. Custom attributes (`status`, `priority`, etc.).
 *
 * Returns `null` for missing values so the sorting logic can push them to the end.
 */
const getUserContentFieldValue = (
  item: UserContentCommonSchema,
  field: string
): string | number | null => {
  switch (field) {
    case 'title':
      return item.attributes?.title ?? '';
    case 'description':
      return item.attributes?.description ?? null;
    case 'updatedAt':
      return item.updatedAt ?? null;
    case 'createdAt':
      return item.createdAt ?? null;
    default:
      break;
  }

  const topLevelValue = getSortableProperty(item, field);
  if (topLevelValue !== null) {
    return topLevelValue;
  }

  return getSortableProperty(item.attributes, field);
};

/**
 * Sorts items by a specified field.
 *
 * @param items - The items to sort.
 * @param field - The field name to sort by.
 * @param direction - Sort direction ('asc' or 'desc').
 * @returns A new sorted array (does not mutate the original).
 */
const sortItems = (
  items: UserContentCommonSchema[],
  field: string,
  direction: 'asc' | 'desc'
): UserContentCommonSchema[] => {
  return [...items].sort((a, b) => {
    const aValue = getUserContentFieldValue(a, field);
    const bValue = getUserContentFieldValue(b, field);

    if (aValue === null && bValue === null) {
      return 0;
    }
    if (aValue === null) {
      return 1;
    }
    if (bValue === null) {
      return -1;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Extract tag IDs from a `UserContentCommonSchema` references array.
 */
const extractTagIds = (refs?: Array<{ type: string; id: string }>): string[] | undefined => {
  if (!refs) {
    return undefined;
  }
  const tagIds = refs.filter((ref) => ref.type === 'tag').map((ref) => ref.id);
  return tagIds.length > 0 ? tagIds : undefined;
};

/**
 * Safely narrow an `ActiveFilters` value to an {@link IncludeExcludeFilter}.
 */
const asIncludeExclude = (
  value: IncludeExcludeFilter | string | boolean | undefined
): IncludeExcludeFilter | undefined =>
  value && typeof value === 'object' && ('include' in value || 'exclude' in value)
    ? (value as IncludeExcludeFilter)
    : undefined;

/**
 * Resolve the effective creator key for an item, mapping to sentinel values
 * for managed items and items without a creator.
 */
export const getCreatorKey = (item: UserContentCommonSchema): string => {
  if (item.managed) {
    return MANAGED_USER_FILTER;
  }
  return item.createdBy ?? NO_CREATOR_USER_FILTER;
};

/**
 * Apply client-side tag and createdBy filters to the item set.
 *
 * Tag filters use `filters[TAG_FILTER_ID]` (include/exclude arrays of tag IDs).
 * Creator filters use `filters.user` (include/exclude arrays of UIDs + sentinels).
 * Starred filtering requires the set of favorite item IDs.
 *
 * Exported so that {@link ContentListClientProvider} facet implementations can
 * apply the same filtering to compute faceted counts.
 */
export const filterItems = (
  items: UserContentCommonSchema[],
  filters: ActiveFilters,
  favoriteIds?: Set<string>
): UserContentCommonSchema[] => {
  let result = items;

  const tagFilter = asIncludeExclude(filters[TAG_FILTER_ID]);
  if (tagFilter) {
    const { include, exclude } = tagFilter;
    if (include?.length) {
      const includeSet = new Set(include);
      result = result.filter((item) =>
        item.references?.some((ref) => ref.type === 'tag' && includeSet.has(ref.id))
      );
    }
    if (exclude?.length) {
      const excludeSet = new Set(exclude);
      result = result.filter(
        (item) => !item.references?.some((ref) => ref.type === 'tag' && excludeSet.has(ref.id))
      );
    }
  }

  const userFilter = asIncludeExclude(filters.createdBy);
  if (userFilter) {
    const { include, exclude } = userFilter;
    if (include?.length) {
      const includeSet = new Set(include);
      result = result.filter((item) => includeSet.has(getCreatorKey(item)));
    }
    if (exclude?.length) {
      const excludeSet = new Set(exclude);
      result = result.filter((item) => !excludeSet.has(getCreatorKey(item)));
    }
  }

  if (filters.starredOnly && favoriteIds) {
    result = result.filter((item) => favoriteIds.has(item.id));
  }

  return result;
};

/**
 * Transforms a `UserContentCommonSchema` item to `ContentListItem`.
 *
 * This is applied only to paginated results for performance.
 * Missing `attributes` or `title` are normalized to an empty string so the UI can still render.
 */
const transformItem = (item: UserContentCommonSchema): ContentListItem => ({
  id: item.id,
  title: item.attributes?.title ?? '',
  description: item.attributes?.description,
  type: item.type,
  updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
  tags: extractTagIds(item.references),
  createdBy: item.createdBy,
  managed: item.managed,
});

/**
 * Creates a client strategy that wraps a `TableListView`-style `findItems` function.
 *
 * The strategy caches the server response keyed by `searchQuery`. When filters,
 * sort, or page change without a new search query, the cached items are reused
 * and only the client-side transforms are reapplied — no server fetch occurs.
 *
 * The core provider calls {@link ClientStrategy.onInvalidate} before any
 * explicit refetch (e.g. after a delete) to force the next `findItems` call
 * to hit the server.
 *
 * @param tableListViewFindItems - The consumer's existing `findItems` function.
 * @param favoritesClient - Optional favorites client for starred filtering.
 * @returns A {@link ClientStrategy} with `findItems`, `invalidate`, and `getItems`.
 */
export const createClientStrategy = (
  tableListViewFindItems: TableListViewFindItemsFn,
  favoritesClient?: FavoritesClientPublic
): ClientStrategy => {
  let cachedItems: UserContentCommonSchema[] = [];
  let lastSearchQuery: string | undefined;

  const findItemsFn: FindItemsFn = async (params: FindItemsParams): Promise<FindItemsResult> => {
    const { searchQuery, filters, sort, page, signal } = params;

    if (lastSearchQuery !== searchQuery) {
      const result = await tableListViewFindItems(searchQuery, undefined, signal);
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      cachedItems = result.hits;
      lastSearchQuery = searchQuery;
    }

    let favoriteIds: Set<string> | undefined;
    if (filters.starredOnly && favoritesClient) {
      const { favoriteIds: ids } = await favoritesClient.getFavorites();
      favoriteIds = new Set(ids);
    }

    let items = filterItems(cachedItems, filters, favoriteIds);

    if (sort?.field) {
      items = sortItems(items, sort.field, sort.direction ?? 'asc');
    }

    const start = page.index * page.size;
    const pageItems = items.slice(start, start + page.size);

    return {
      items: pageItems.map(transformItem),
      total: items.length,
    };
  };

  const onInvalidate = () => {
    lastSearchQuery = undefined;
    cachedItems = [];
  };

  return {
    findItems: findItemsFn,
    onInvalidate,
    getItems: () => cachedItems,
  };
};
