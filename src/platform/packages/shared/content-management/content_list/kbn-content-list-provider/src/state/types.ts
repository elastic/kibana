/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import type { ActiveFilters } from '../datasource';
import type { ContentListItem } from '../item';

/**
 * Action type constants for state reducer.
 *
 * @internal
 */
export const CONTENT_LIST_ACTIONS = {
  SET_SORT: 'SET_SORT',
  SET_SELECTION: 'SET_SELECTION',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
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
  /** Selection state - IDs of currently selected items. */
  selection: {
    /** IDs of selected items. */
    selectedIds: string[];
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
  /** Whether data is currently being fetched. */
  isLoading: boolean;
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
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SELECTION; payload: { ids: string[] } }
  | { type: typeof CONTENT_LIST_ACTIONS.CLEAR_SELECTION };

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
