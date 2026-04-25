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

/**
 * Action type constants for state reducer.
 */
export const CONTENT_LIST_ACTIONS = {
  /** Set the query text (source of truth for search, filters, and flags). */
  SET_QUERY: 'SET_QUERY',
  /** Hard-reset: clear all query text (search, filters, and flags). */
  RESET_QUERY: 'RESET_QUERY',
  /** Set sort field and direction. */
  SET_SORT: 'SET_SORT',
  /** Set page index. */
  SET_PAGE_INDEX: 'SET_PAGE_INDEX',
  /** Set page size. */
  SET_PAGE_SIZE: 'SET_PAGE_SIZE',
  SET_SELECTION: 'SET_SELECTION',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
} as const;

/**
 * Client-controlled state managed by the reducer.
 *
 * This includes user-driven state like query text, sort, and pagination.
 * Query data (items, loading, error) comes directly from React Query.
 */
export interface ContentListClientState {
  /**
   * The query text — single source of truth for the search bar.
   *
   * All search, filter, and flag state lives in this string (e.g.,
   * `"createdBy:jane@elastic.co is:starred dashboard"`). The structured
   * model ({@link ContentListQueryModel}) is derived on-demand via
   * `useQueryModel`.
   */
  queryText: string;
  /** Sort state. */
  sort: {
    /** Field name to sort by. */
    field: string;
    /** Sort direction. */
    direction: 'asc' | 'desc';
  };
  /** Pagination state. */
  page: {
    /** Current page index (0-based). */
    index: number;
    /** Current number of items per page. */
    size: number;
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

/** Set the query text. */
interface SetQueryAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_QUERY;
  payload: { queryText: string };
}

/** Hard-reset: clear all query text (search, filters, and flags). */
interface ResetQueryAction {
  type: typeof CONTENT_LIST_ACTIONS.RESET_QUERY;
}

/** Set sort field and direction. */
interface SetSortAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_SORT;
  payload: { field: string; direction: 'asc' | 'desc' };
}

/**
 * Union type of all possible state actions.
 *
 * @internal Used by the state reducer and dispatch function.
 */
export type ContentListAction =
  | SetQueryAction
  | ResetQueryAction
  | SetSortAction
  | { type: typeof CONTENT_LIST_ACTIONS.SET_PAGE_INDEX; payload: { index: number } }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_PAGE_SIZE; payload: { size: number } }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SELECTION; payload: { ids: string[] } }
  | { type: typeof CONTENT_LIST_ACTIONS.CLEAR_SELECTION };

/**
 * Context value provided by `ContentListStateProvider`.
 */
export interface ContentListStateContextValue {
  /** Current state of the content list (client state + query data). */
  state: ContentListState;
  /** Dispatch function for client state updates (search, filters, sort). */
  dispatch: Dispatch<ContentListAction>;
  /**
   * Full refetch: clears the data-source cache (`onInvalidate`) then
   * re-executes the query. Use after item mutations (edit, delete, create).
   */
  refetch: () => Promise<void>;
  /**
   * Lightweight refresh: re-decorates cached items with external data
   * (`onRefresh`) then re-executes the query without clearing the cache.
   * Use after external data mutations (star/unstar).
   */
  refresh: () => Promise<void>;
}
