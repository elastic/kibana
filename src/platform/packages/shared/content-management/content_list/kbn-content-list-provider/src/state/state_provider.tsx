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
import { isSortingConfig, isPaginationConfig } from '../features';
import { DEFAULT_PAGE_SIZE } from '../features/pagination';
import { getPersistedPageSize } from '../features/pagination';
import type { PaginationConfig } from '../features/pagination';
import { reducer } from './state_reducer';
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
 * - Manages client-controlled state (filters, sort, pagination) via reducer.
 * - Uses React Query for data fetching with caching and deduplication.
 * - Combines client state with query data for a unified state interface.
 *
 * Note: Initial state is derived from `features.sorting` and `features.pagination`
 * at mount and not updated if configuration changes. See {@link ContentListProvider}
 * for details.
 *
 * @internal This is automatically included when using `ContentListProvider`.
 */
export const ContentListStateProvider = ({ children }: ContentListStateProviderProps) => {
  const { features, queryKeyScope } = useContentListConfig();
  const { sorting, pagination } = features;

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

  // Initial client state (filters, sort, page).
  const initialClientState: ContentListClientState = useMemo(
    () => ({
      filters: { ...DEFAULT_FILTERS },
      sort: initialSort,
      page: { index: 0, size: initialPageSize },
    }),
    [initialSort, initialPageSize]
  );

  const [clientState, dispatch] = useReducer(reducer, initialClientState);

  // Use React Query for data fetching - returns query data directly.
  const {
    items,
    totalItems,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useContentListItemsQuery(clientState);

  // Expose refetch for manual refresh.
  const refetch = useCallback(() => queryRefetch(), [queryRefetch]);

  // Combine client state with query data for unified state interface.
  const contextValue: ContentListStateContextValue = useMemo(
    () => ({
      state: {
        ...clientState,
        items,
        totalItems,
        isLoading,
        error,
      },
      dispatch,
      refetch,
    }),
    [clientState, items, totalItems, isLoading, error, dispatch, refetch]
  );

  return (
    <ContentListStateContext.Provider value={contextValue}>
      {children}
    </ContentListStateContext.Provider>
  );
};
