/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { useTagServices } from '@kbn/content-management-tags';
import { Query } from '@elastic/eui';
import { useContentListState } from '../../state/use_content_list_state';
import type { ActiveFilters } from './types';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import {
  getAllCustomFilterKeys,
  buildQuerySchema,
  extractStarred,
  extractUsers,
  extractCustomFilters,
  extractCleanSearch,
} from '../../query/parsing';

/**
 * Hook to access and control filtering functionality
 *
 * Use this hook when you need to read or update filters (tags, users, starred, etc.).
 *
 * @throws Error if used outside ContentListProvider
 * @returns Object containing:
 *   - filters: All currently active filters (merged from state and query-derived)
 *   - setFilters: Function to update the filters
 *   - clearFilters: Function to clear all filters
 *
 * @example
 * ```tsx
 * function FilterPanel() {
 *   const { filters, setFilters, clearFilters } = useContentListFilters();
 *
 *   const toggleUserFilter = (userId: string) => {
 *     const users = filters.users || [];
 *     const newUsers = users.includes(userId)
 *       ? users.filter(u => u !== userId)
 *       : [...users, userId];
 *     setFilters({ ...filters, users: newUsers });
 *   };
 *
 *   return (
 *     <div>
 *       {filters.tags?.include.map(tag => (
 *         <EuiBadge key={tag}>{tag}</EuiBadge>
 *       ))}
 *       <EuiButton onClick={clearFilters}>Clear all</EuiButton>
 *     </div>
 *   );
 * }
 * ```
 */
export const useContentListFilters = () => {
  const { state, dispatch, features } = useContentListState();
  const { filtering } = features;
  const tagServices = useTagServices();
  const parseSearchQuery = tagServices?.parseSearchQuery;

  // Get filtering config for custom fields.
  const filteringConfig = typeof filtering === 'object' ? filtering : undefined;

  // Get all custom filter keys from config.
  const customFilterKeys = useMemo(
    () => getAllCustomFilterKeys(filteringConfig),
    [filteringConfig]
  );

  // Build dynamic schema once based on custom filter keys.
  // Uses `strict: false` to allow other field clauses (like `tag:`) that may remain in
  // the query text if `parseSearchQuery` didn't extract them.
  const querySchema = useMemo(
    () => buildQuerySchema(customFilterKeys, { strict: false }),
    [customFilterKeys]
  );

  // Parse tags, starred, users, custom filters, and search text from query text.
  const queryFilters: ActiveFilters = useMemo(() => {
    const queryText = state.search.queryText;
    if (!queryText) {
      return {
        search: undefined,
        tags: undefined,
        users: undefined,
        starredOnly: undefined,
      };
    }

    // Parse tags using the tagging service - also extracts clean search text.
    let tagsInclude: string[] | undefined;
    let tagsExclude: string[] | undefined;
    let searchText: string | undefined;

    if (parseSearchQuery) {
      const parsed = parseSearchQuery(queryText);
      tagsInclude = parsed.tagIds;
      tagsExclude = parsed.tagIdsToExclude;
      // `searchQuery` from `parseSearchQuery` is the clean text without `tag:` syntax.
      searchText = parsed.searchQuery;
    } else {
      // If no tag parser, use the full query text as search.
      searchText = queryText;
    }

    // Parse `is:starred`, `createdBy:xxx`, and custom fields from query text.
    let starredOnly: boolean | undefined;
    let users: string[] | undefined;
    let customFilters: Record<string, string[]> = {};

    if (searchText) {
      try {
        const query = Query.parse(searchText, { schema: querySchema });
        starredOnly = extractStarred(query) || undefined;
        users = extractUsers(query);
        customFilters = extractCustomFilters(query, customFilterKeys);
        searchText = extractCleanSearch(query);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('[useContentListFilters] Query parsing error:', error);
        }
      }
    }

    // Build tags object if any tags are present.
    const hasTags =
      (tagsInclude && tagsInclude.length > 0) || (tagsExclude && tagsExclude.length > 0);

    return {
      search: searchText?.trim() || undefined,
      tags: hasTags
        ? {
            include: tagsInclude ?? [],
            exclude: tagsExclude ?? [],
          }
        : undefined,
      users: users && users.length > 0 ? users : undefined,
      starredOnly,
      // Spread custom filters into the result.
      ...customFilters,
    };
  }, [state.search.queryText, parseSearchQuery, querySchema, customFilterKeys]);

  // Compute merged filters (combine state filters with query-derived filters).
  // Query-derived filters (tags, starred, search, custom) override state filters
  // since they're the source of truth from the search bar.
  const filters: ActiveFilters = useMemo(() => {
    const merged: ActiveFilters = {
      ...state.filters,
      // Query-derived filters override state filters for known fields.
      search: queryFilters.search ?? state.filters.search,
      tags: queryFilters.tags ?? state.filters.tags,
      users: queryFilters.users ?? state.filters.users,
      starredOnly: queryFilters.starredOnly ?? state.filters.starredOnly,
    };

    // Merge custom filter values from query text (these override state).
    customFilterKeys.forEach((key) => {
      const queryValue = queryFilters[key];
      if (queryValue !== undefined) {
        merged[key] = queryValue;
      }
    });

    return merged;
  }, [state.filters, queryFilters, customFilterKeys]);

  const setFilters = useCallback(
    (newFilters: ActiveFilters) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_FILTERS, payload: newFilters });
    },
    [dispatch]
  );

  const clearFilters = useCallback(() => {
    dispatch({ type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS });
  }, [dispatch]);

  return {
    filters,
    setFilters,
    clearFilters,
  };
};
