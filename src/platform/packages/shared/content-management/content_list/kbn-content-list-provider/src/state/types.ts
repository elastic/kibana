/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import type { ContentListItem } from '../item';
import type { ActiveFilters } from '../datasource';

/**
 * Action type constants for state reducer.
 *
 * @internal
 */
export const CONTENT_LIST_ACTIONS = {
  SET_SORT: 'SET_SORT',
  SET_SEARCH: 'SET_SEARCH',
} as const;

/**
 * Default filter state.
 */
export const DEFAULT_FILTERS: ActiveFilters = {
  search: undefined,
};

/**
 * Client-controlled state managed by the reducer.
 *
 * This includes user-driven state like filters and sort configuration.
 * Query data (items, loading, error) comes directly from React Query.
 */
export interface ContentListClientState {
  /** Filter state - currently applied filters. */
  filters: ActiveFilters;
  /** Sort state. */
  sort: {
    /** Field name to sort by. */
    field: string;
    /** Sort direction. */
    direction: 'asc' | 'desc';
  };
}

/**
 * Query data returned from React Query.
 *
 * This is read-only state derived from the data fetching layer.
 */
export interface ContentListQueryData {
  /** Currently loaded items (transformed for rendering). */
  items: ContentListItem[];
  /** Total number of items matching the current query (for pagination). */
  totalItems: number;
  /**
   * Whether the initial data load is in progress (no data available yet).
   *
   * This is `true` only on the first fetch before any data has been received.
   * Use this for hard loading states (e.g., skeletons, spinners) when there is
   * nothing to show. Once data has been loaded, subsequent fetches triggered by
   * filter or search changes keep `isLoading` as `false` while the previous
   * data remains visible.
   */
  isLoading: boolean;
  /**
   * Whether a fetch is currently in progress (including background refetches).
   *
   * Unlike `isLoading`, this is `true` during any fetch, including background
   * refetches triggered by search, sort, or filter changes. Use this for subtle
   * loading indicators (e.g., progress bar, reduced opacity) that should not
   * hide existing content.
   */
  isFetching: boolean;
  /** Error from the most recent fetch attempt. */
  error?: Error;
}

/**
 * Combined state structure for the content list.
 *
 * Merges client-controlled state with query data.
 */
export type ContentListState = ContentListClientState & ContentListQueryData;

/**
 * Union type of all possible state actions.
 *
 * @internal Used by the state reducer and dispatch function.
 */
export type ContentListAction =
  | {
      type: typeof CONTENT_LIST_ACTIONS.SET_SORT;
      payload: { field: string; direction: 'asc' | 'desc' };
    }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SEARCH; payload: { search: string } };

/**
 * Context value provided by `ContentListStateProvider`.
 */
export interface ContentListStateContextValue {
  /** Current state of the content list (client state + query data). */
  state: ContentListState;
  /** Dispatch function for client state updates (filters, sort). */
  dispatch: Dispatch<ContentListAction>;
  /** Function to manually refetch items from the data source. */
  refetch: () => void;
}
