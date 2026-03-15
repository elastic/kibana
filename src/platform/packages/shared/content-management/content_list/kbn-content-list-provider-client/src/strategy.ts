/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type {
  ActiveFilters,
  IncludeExcludeFilter,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  ContentListItem,
} from '@kbn/content-list-provider';
import {
  TAG_FILTER_ID,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
} from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn } from './types';

/**
 * Return type from {@link createClientStrategy}.
 */
export interface ClientStrategy {
  /** Adapted `findItems` compatible with `ContentListProvider`. */
  findItems: FindItemsFn;
  /** Returns the full item set from the most recent `findItems` call. */
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
  // Handle known fields.
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

  // Check top-level item fields first (id, type, etc.).
  const topLevelValue = getSortableProperty(item, field);
  if (topLevelValue !== null) {
    return topLevelValue;
  }

  // Check custom attributes (status, priority, etc.).
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

    // Push null values to the end regardless of sort direction.
    if (aValue === null && bValue === null) {
      return 0;
    }
    if (aValue === null) {
      return 1;
    }
    if (bValue === null) {
      return -1;
    }

    // Use localeCompare for proper string sorting.
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    }

    // Numeric comparison.
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
const getCreatorKey = (item: UserContentCommonSchema): string => {
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

  const userFilter = filters.user;
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
 * Options for {@link createClientStrategy}.
 */
export interface ClientStrategyOptions {
  /** The consumer's existing `findItems` function. */
  findItems: TableListViewFindItemsFn;
  /** Optional favorites client for `starredOnly` filtering. */
  favoritesClient?: FavoritesClientPublic;
}

/**
 * Creates a client strategy that wraps a `TableListView`-style `findItems` function.
 *
 * This adapter:
 * - Translates between the old and new API signatures.
 * - Applies client-side filtering (tags, createdBy, starred) from `params.filters`.
 * - Applies client-side sorting and pagination (matching original `TableListView` behavior).
 * - Transforms results to `ContentListItem` format (only for the returned page).
 * - Caches the full item set from each `findItems` call, exposed via `getItems()`.
 * - Forwards the `AbortSignal` for request cancellation (consumers may optionally respect it).
 *
 * The item cache is always fresh because `findItems` runs first (React Query calls it on
 * search/filter changes) and `getMetadata` runs after (popover opens after items are displayed).
 *
 * @param options - See {@link ClientStrategyOptions}.
 * @returns A {@link ClientStrategy} with `findItems` and `getItems`.
 */
export const createClientStrategy = (options: ClientStrategyOptions): ClientStrategy => {
  const { findItems: tableListViewFindItems, favoritesClient } = options;

  let cachedItems: UserContentCommonSchema[] = [];

  const findItemsFn: FindItemsFn = async (params: FindItemsParams): Promise<FindItemsResult> => {
    const { searchQuery, filters, sort, page, signal } = params;

    // Fetch all items from the consumer's findItems, forwarding the abort signal.
    const result = await tableListViewFindItems(searchQuery, undefined, signal);
    cachedItems = result.hits;

    // Resolve favorite IDs when starred filter is active.
    let favoriteIds: Set<string> | undefined;
    if (filters.starredOnly && favoritesClient) {
      const { favoriteIds: ids } = await favoritesClient.getFavorites();
      favoriteIds = new Set(ids);
    }

    // Apply client-side filtering (tags, createdBy, starred).
    let items = filterItems(result.hits, filters, favoriteIds);

    // Apply client-side sorting only if sort is specified.
    // When sorting is disabled, items are returned in their natural order (server default).
    if (sort?.field) {
      items = sortItems(items, sort.field, sort.direction ?? 'asc');
    }

    // Apply client-side pagination.
    const start = page.index * page.size;
    const end = start + page.size;
    const pageItems = items.slice(start, end);

    // Transform only the paginated items to ContentListItem format.
    // Use the filtered count as the total so pagination reflects the filtered set.
    return {
      items: pageItems.map(transformItem),
      total: items.length,
    };
  };

  const getItems = () => cachedItems;

  return { findItems: findItemsFn, getItems };
};
