/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { Query } from '@elastic/eui';
import type { Tag } from './types';

/**
 * Parameters for the {@link useTags} hook.
 *
 * @typeParam T - The item type, must have an `id` property and optional `tags` array of tag IDs.
 */
export interface UseTagsParams<T extends { id: string; tags?: string[] }> {
  /** The current EUI Query object representing the active search/filter state. */
  query: Query;
  /**
   * Callback to update the query when tag filters change.
   * @param query - The updated EUI Query object.
   */
  updateQuery: (query: Query) => void;
  /** The list of items to build the tag-to-item mapping from. */
  items: T[];
}

/**
 * Return value from the {@link useTags} hook.
 */
export interface UseTagsReturn {
  /**
   * Toggles a tag in/out of the include filter. If the tag is in the exclude filter, it is removed first.
   * @param tag - The tag to toggle.
   */
  toggleIncludeTagFilter: (tag: Tag) => void;
  /**
   * Toggles a tag in/out of the exclude filter. If the tag is in the include filter, it is removed first.
   * @param tag - The tag to toggle.
   */
  toggleExcludeTagFilter: (tag: Tag) => void;
  /** Removes all tag filter clauses from the query. */
  clearTagSelection: () => void;
  /** A mapping of tag IDs to arrays of item IDs that have that tag. */
  tagsToTableItemMap: { [tagId: string]: string[] };
}

/**
 * React hook for managing tag-based filtering in EUI Query search interfaces.
 *
 * Provides utilities to toggle tags between include/exclude filter states and
 * maintains a reverse mapping of tags to items for efficient lookups.
 *
 * The hook manipulates the `tag` field in EUI Query syntax:
 * - Include filter: `tag:tagName` (must match)
 * - Exclude filter: `-tag:tagName` (must not match)
 *
 * @typeParam T - The item type with required `id` and optional `tags` properties.
 *
 * @returns An object containing filter toggle functions and a tag-to-item mapping.
 *
 * @example
 * ```tsx
 * const { toggleIncludeTagFilter, toggleExcludeTagFilter, clearTagSelection, tagsToTableItemMap } =
 *   useTags({ query, updateQuery: setQuery, items: dashboards });
 *
 * // Add tag to include filter (or remove if already included)
 * toggleIncludeTagFilter(productionTag);
 *
 * // Add tag to exclude filter (or remove if already excluded)
 * toggleExcludeTagFilter(deprecatedTag);
 *
 * // Clear all tag filters
 * clearTagSelection();
 * ```
 */
export const useTags = <T extends { id: string; tags?: string[] }>(
  params: UseTagsParams<T>
): UseTagsReturn => {
  const { query, updateQuery, items } = params;
  // Return a map of tag.id to an array of item ids having that tag
  // { 'abc-123': ['item_id_1', 'item_id_2', ...] }
  const tagsToTableItemMap = useMemo(() => {
    return items.reduce<Record<string, string[]>>((acc, item) => {
      if (!item.tags || item.tags.length === 0) {
        return acc;
      }

      item.tags.forEach((tagId) => {
        if (!acc[tagId]) {
          acc[tagId] = [];
        }
        acc[tagId].push(item.id);
      });

      return acc;
    }, {});
  }, [items]);

  // Helper to check if tag exists in a clause type
  const hasTagInClause = useCallback(
    (tag: Tag, matchType: 'must' | 'must_not', queryToCheck: Query = query): boolean => {
      const tagClauses = queryToCheck.ast.getFieldClauses('tag');
      if (!tagClauses?.length) {
        return false;
      }

      return tagClauses
        .filter(({ match }) => match === matchType)
        .some((clause) => {
          const clauseValues = Array.isArray(clause.value) ? clause.value : [clause.value];
          return clauseValues.some((value) => value === tag.name);
        });
    },
    [query]
  );

  const toggleIncludeTagFilter = useCallback(
    (tag: Tag) => {
      let newQuery = query;

      // Remove from exclude if present
      if (hasTagInClause(tag, 'must_not', newQuery)) {
        newQuery = newQuery.removeOrFieldValue('tag', tag.name);
      }

      // Toggle include
      if (hasTagInClause(tag, 'must', newQuery)) {
        newQuery = newQuery.removeOrFieldValue('tag', tag.name);
      } else {
        newQuery = newQuery.addOrFieldValue('tag', tag.name, true, 'eq');
      }

      updateQuery(newQuery);
    },
    [query, updateQuery, hasTagInClause]
  );

  const toggleExcludeTagFilter = useCallback(
    (tag: Tag) => {
      let newQuery = query;

      // Remove from include if present
      if (hasTagInClause(tag, 'must', newQuery)) {
        newQuery = newQuery.removeOrFieldValue('tag', tag.name);
      }

      // Toggle exclude
      if (hasTagInClause(tag, 'must_not', newQuery)) {
        newQuery = newQuery.removeOrFieldValue('tag', tag.name);
      } else {
        newQuery = newQuery.addOrFieldValue('tag', tag.name, false, 'eq');
      }

      updateQuery(newQuery);
    },
    [query, updateQuery, hasTagInClause]
  );

  const clearTagSelection = useCallback(() => {
    const updatedQuery = query.removeOrFieldClauses('tag');
    updateQuery(updatedQuery);
  }, [query, updateQuery]);

  return {
    toggleIncludeTagFilter,
    toggleExcludeTagFilter,
    clearTagSelection,
    tagsToTableItemMap,
  };
};
