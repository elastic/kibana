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
  REQUEST_DELETE: 'REQUEST_DELETE',
  CONFIRM_DELETE_START: 'CONFIRM_DELETE_START',
  CANCEL_DELETE: 'CANCEL_DELETE',
  DELETE_COMPLETED: 'DELETE_COMPLETED',
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
  /** Pending delete request, or `null` when no delete is in progress. */
  deleteRequest: { items: ContentListItem[] } | null;
  /** Whether a delete operation is currently executing. */
  isDeleting: boolean;
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
  | { type: typeof CONTENT_LIST_ACTIONS.REQUEST_DELETE; payload: { items: ContentListItem[] } }
  | { type: typeof CONTENT_LIST_ACTIONS.CONFIRM_DELETE_START }
  | { type: typeof CONTENT_LIST_ACTIONS.CANCEL_DELETE }
  | { type: typeof CONTENT_LIST_ACTIONS.DELETE_COMPLETED };

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
