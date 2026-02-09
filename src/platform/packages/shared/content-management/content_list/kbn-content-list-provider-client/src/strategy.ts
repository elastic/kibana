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
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  ContentListItem,
} from '@kbn/content-list-provider';
import type { TableListViewFindItemsFn } from './types';

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
});

/**
 * Creates a `FindItemsFn` that wraps a `TableListView`-style `findItems` function.
 *
 * This adapter:
 * - Translates between the old and new API signatures.
 * - Applies client-side sorting and pagination (matching original `TableListView` behavior).
 * - Transforms results to `ContentListItem` format (only for the returned page).
 * - Forwards the `AbortSignal` for request cancellation (consumers may optionally respect it).
 *
 * **Limitations:**
 * - Only `searchQuery` is passed to the underlying `findItems`. The `params.filters` object
 *   and `refs` (references/referencesToExclude) from the second parameter are not forwarded.
 *
 * @param tableListViewFindItems - The consumer's existing `findItems` function.
 * @returns A `FindItemsFn` compatible with `ContentListProvider`.
 */
export const createFindItemsFn = (
  tableListViewFindItems: TableListViewFindItemsFn
): FindItemsFn => {
  return async (params: FindItemsParams): Promise<FindItemsResult> => {
    const { searchQuery, sort, page, signal } = params;

    // Fetch all items from the consumer's findItems, forwarding the abort signal.
    const result = await tableListViewFindItems(searchQuery, undefined, signal);
    let items = result.hits;

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
    return {
      items: pageItems.map(transformItem),
      total: result.total,
    };
  };
};
