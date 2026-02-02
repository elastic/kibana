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
import type { ContentListState, ContentListStateContextValue } from './types';
import { DEFAULT_FILTERS } from './types';
import { ContentListStateContext } from './use_content_list_state';
import { useContentListConfig } from '../context';
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
 * Internal provider component that manages the runtime state of the content list.
 *
 * This provider:
 * - Initializes state from the configuration context.
 * - Uses React Query for data fetching with caching and deduplication.
 * - Provides dispatch function for state updates.
 *
 * @internal This is automatically included when using `ContentListProvider`.
 */
export const ContentListStateProvider = ({ children }: ContentListStateProviderProps) => {
  const { features, dataSource } = useContentListConfig();
  const { sorting } = features;

  // Determine initial sort from sorting config (default: title ascending).
  const initialSort = useMemo(() => {
    if (typeof sorting === 'object' && sorting.initialSort) {
      return sorting.initialSort;
    }
    return { field: 'title', direction: 'asc' as const };
  }, [sorting]);

  // Initial state with sensible defaults.
  const initialState: ContentListState = useMemo(
    () => ({
      items: [],
      totalItems: 0,
      isLoading: true,
      error: undefined,
      filters: { ...DEFAULT_FILTERS },
      sort: initialSort,
    }),
    [initialSort]
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Use React Query for data fetching.
  const { refetch: queryRefetch } = useContentListItemsQuery(state, dispatch);

  // Wrap refetch to clear internal caches before fetching fresh data.
  const refetch = useCallback(() => {
    if (dataSource.clearCache) {
      dataSource.clearCache();
    }
    return queryRefetch();
  }, [dataSource, queryRefetch]);

  // Memoize context value to prevent unnecessary re-renders.
  const contextValue: ContentListStateContextValue = useMemo(
    () => ({
      state,
      dispatch,
      refetch,
    }),
    [state, dispatch, refetch]
  );

  return (
    <ContentListStateContext.Provider value={contextValue}>
      {children}
    </ContentListStateContext.Provider>
  );
};
