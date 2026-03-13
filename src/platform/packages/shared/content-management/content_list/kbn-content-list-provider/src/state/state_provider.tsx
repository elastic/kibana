/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useReducer, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ContentListClientState, ContentListStateContextValue } from './types';
import { DEFAULT_FILTERS } from './types';
import { CREATED_BY_FILTER_ID } from '../datasource';
import {
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
} from '../features/filtering/user_profile/constants';
import type { CreatorsList } from '../features/filtering/user_profile/types';
import { ContentListStateContext } from './use_content_list_state';
import { useContentListConfig } from '../context';
import { isSortingConfig, isPaginationConfig, isSearchConfig } from '../features';
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
  const {
    items,
    totalItems,
    counts,
    isLoading,
    isFetching,
    error,
    refetch: queryRefetch,
  } = useContentListItemsQuery(clientState);

  // Expose refetch for manual refresh.
  const refetch = useCallback(() => queryRefetch(), [queryRefetch]);

  // Derive the creator list for the "Created by" filter popover.
  //
  // Prefer `counts[CREATED_BY_FILTER_ID]` when available — data sources
  // should compute these counts BEFORE applying the `createdBy` filter so
  // the popover always shows the full list of creators for the current
  // search/tag context (standard faceted-search behavior).
  //
  // Fallback: scan `items` when counts are not provided. The accumulator
  // preserves creators across page navigation but can only learn about
  // pages the user has visited. Creators on unseen pages will not appear
  // in the popover until the user navigates there. Data sources that want
  // a complete creator list should provide `counts.createdBy`.
  const creatorAccRef = useRef<{
    uids: Set<string>;
    hasManaged: boolean;
    hasNoCreator: boolean;
    resetKey: string;
  }>({ uids: new Set(), hasManaged: false, hasNoCreator: false, resetKey: '' });

  const allCreators: CreatorsList = useMemo(() => {
    const creatorCounts = counts?.[CREATED_BY_FILTER_ID];

    if (creatorCounts) {
      const uids = Object.keys(creatorCounts).filter(
        (key) => key !== MANAGED_USER_FILTER && key !== NO_CREATOR_USER_FILTER
      );
      return {
        uids,
        hasManaged: MANAGED_USER_FILTER in creatorCounts,
        hasNoCreator: NO_CREATOR_USER_FILTER in creatorCounts,
      };
    }

    // Build a reset key from search text and non-user filters so the
    // accumulator resets when the result set changes but persists across
    // page changes and user-filter toggles.
    const { user: _u, ...nonUserFilters } = clientState.filters;
    const resetKey = `${clientState.search.queryText}\0${JSON.stringify(nonUserFilters)}`;

    const acc = creatorAccRef.current;
    if (acc.resetKey !== resetKey) {
      acc.uids = new Set();
      acc.hasManaged = false;
      acc.hasNoCreator = false;
      acc.resetKey = resetKey;
    }

    for (const item of items) {
      if (item.managed) {
        acc.hasManaged = true;
      } else if (item.createdBy) {
        acc.uids.add(item.createdBy);
      } else {
        acc.hasNoCreator = true;
      }
    }

    return {
      uids: Array.from(acc.uids),
      hasNoCreator: acc.hasNoCreator,
      hasManaged: acc.hasManaged,
    };
  }, [items, counts, clientState.search.queryText, clientState.filters]);

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
