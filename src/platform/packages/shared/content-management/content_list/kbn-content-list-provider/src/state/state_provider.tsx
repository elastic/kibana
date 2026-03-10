/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ContentListClientState, ContentListStateContextValue } from './types';
import { DEFAULT_FILTERS } from './types';
import { ContentListStateContext } from './use_content_list_state';
import { useContentListConfig } from '../context';
import { isSortingConfig, isPaginationConfig, isSearchConfig } from '../features';
import { MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER } from '../features';
import type { CreatorsList } from '../features';
import { DEFAULT_PAGE_SIZE } from '../features/pagination';
import { getPersistedPageSize } from '../features/pagination';
import type { PaginationConfig } from '../features/pagination';
import { reducer, DEFAULT_SELECTION } from './state_reducer';
import { useContentListItemsQuery } from '../query';

/**
 * Props for `ContentListStateProvider`.
 */
export interface ContentListStateProviderProps {
  /** Child components that will have access to the state context. */
  children: ReactNode;
}

/**
 * Resolve the initial page size from pagination config.
 *
 * Precedence:
 * 1. Persisted page size for the given `queryKeyScope` (user preference).
 * 2. Explicit `pagination.initialPageSize` (if provided).
 * 3. {@link DEFAULT_PAGE_SIZE}.
 */
const resolveInitialPageSize = (
  queryKeyScope: string,
  pagination?: PaginationConfig | boolean
): number => {
  const configuredDefault =
    isPaginationConfig(pagination) && typeof pagination.initialPageSize === 'number'
      ? pagination.initialPageSize
      : DEFAULT_PAGE_SIZE;

  return getPersistedPageSize(queryKeyScope, configuredDefault);
};

/**
 * Internal provider component that manages the runtime state of the content list.
 *
 * This provider:
 * - Manages client-controlled state (search, filters, sort, pagination, selection) via reducer.
 * - Uses React Query for data fetching with caching and deduplication.
 * - Applies user filtering client-side after fetch, so the full creator list is always available.
 * - Combines client state with query data for a unified state interface.
 *
 * Note: Initial state is derived from `features.sorting`, `features.pagination`, and
 * `features.search` at mount and not updated if configuration changes.
 * See {@link ContentListProvider} for details.
 *
 * @internal This is automatically included when using `ContentListProvider`.
 */
export const ContentListStateProvider = ({ children }: ContentListStateProviderProps) => {
  const { features, queryKeyScope } = useContentListConfig();
  const { sorting, pagination, search } = features;

  // Determine initial sort from sorting config (default: title ascending).
  const initialSort = useMemo(() => {
    if (isSortingConfig(sorting) && sorting.initialSort) {
      return sorting.initialSort;
    }
    return { field: 'title', direction: 'asc' as const };
  }, [sorting]);

  // Determine initial page size from pagination config or persisted value.
  const initialPageSize = useMemo(
    () => resolveInitialPageSize(queryKeyScope, pagination),
    [pagination, queryKeyScope]
  );

  // Determine initial search from search config (default: undefined).
  const initialSearch = useMemo(() => {
    if (isSearchConfig(search) && search.initialSearch) {
      return search.initialSearch;
    }
    return undefined;
  }, [search]);

  // Initial client state (search, filters, sort, page, selection).
  const initialClientState: ContentListClientState = useMemo(
    () => ({
      search: { queryText: initialSearch ?? '' },
      filters: { ...DEFAULT_FILTERS, search: initialSearch },
      sort: initialSort,
      page: { index: 0, size: initialPageSize },
      selection: { ...DEFAULT_SELECTION },
    }),
    [initialSort, initialPageSize, initialSearch]
  );

  const [clientState, dispatch] = useReducer(reducer, initialClientState);

  // Use React Query for data fetching - returns query data directly.
  // Note: the query excludes `user` from the server request — user filtering
  // is applied client-side below, matching the original `TableListView` pattern.
  const {
    items: unfilteredItems,
    totalItems,
    counts,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useContentListItemsQuery(clientState);

  // Derive the full creator list from the unfiltered query result.
  // This is computed before user filtering so the "Created by" filter popover
  // always shows every creator, regardless of the active filter selection.
  const allCreators: CreatorsList = useMemo(() => {
    const uids = new Set<string>();
    let hasNoCreator = false;
    let hasManaged = false;

    for (const item of unfilteredItems) {
      if (item.managed) {
        hasManaged = true;
      } else if (item.createdBy) {
        uids.add(item.createdBy);
      } else {
        hasNoCreator = true;
      }
    }

    return { uids: Array.from(uids), hasNoCreator, hasManaged };
  }, [unfilteredItems]);

  // Apply user filter client-side using the deduplicated union of all UIDs
  // from `user.uid` (UI-driven) and `user.query` (text-driven).
  const userFilter = clientState.filters.user;
  const items = useMemo(() => {
    if (!userFilter) {
      return unfilteredItems;
    }

    const allUids = new Set([...userFilter.uid, ...Object.values(userFilter.query).flat()]);

    if (allUids.size === 0) {
      return unfilteredItems;
    }

    return unfilteredItems.filter((item) => {
      if (item.managed && allUids.has(MANAGED_USER_FILTER)) {
        return true;
      }
      if (!item.createdBy && !item.managed && allUids.has(NO_CREATOR_USER_FILTER)) {
        return true;
      }
      if (item.createdBy && allUids.has(item.createdBy)) {
        return true;
      }
      return false;
    });
  }, [unfilteredItems, userFilter]);

  // Expose refetch for manual refresh.
  const refetch = useCallback(() => queryRefetch(), [queryRefetch]);

  // Combine client state with query data for unified state interface.
  const contextValue: ContentListStateContextValue = useMemo(
    () => ({
      state: {
        ...clientState,
        items,
        allCreators,
        totalItems,
        counts,
        isLoading,
        isFetching,
        error,
      },
      dispatch,
      refetch,
    }),
    [
      clientState,
      items,
      allCreators,
      totalItems,
      counts,
      isLoading,
      isFetching,
      error,
      dispatch,
      refetch,
    ]
  );

  return (
    <ContentListStateContext.Provider value={contextValue}>
      {children}
    </ContentListStateContext.Provider>
  );
};
