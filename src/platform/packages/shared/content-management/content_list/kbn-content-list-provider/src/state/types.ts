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
 */
export const CONTENT_LIST_ACTIONS = {
  /** Update the search query text (the serialized `EuiSearchBar` `Query`). */
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  /** Update the active filters (parsed from query text by the toolbar). */
  SET_FILTERS: 'SET_FILTERS',
  /** Clear all filters and reset query text. */
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  /** Set sort field and direction. */
  SET_SORT: 'SET_SORT',
  /** Set page index. */
  SET_PAGE_INDEX: 'SET_PAGE_INDEX',
  /** Set page size. */
  SET_PAGE_SIZE: 'SET_PAGE_SIZE',
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
 * This includes user-driven state like search, filters, and sort configuration.
 * Query data (items, loading, error) comes directly from React Query.
 */
export interface ContentListClientState {
  /**
   * Search state — the serialized `EuiSearchBar` query text is the source of truth
   * for the search input value. This may contain filter syntax (e.g. `tag:foo`).
   */
  search: {
    /** Full query text including filter syntax (e.g. `tag:foo search text`). */
    queryText: string;
  };
  /**
   * Parsed filter state used to drive data fetching.
   *
   * Updated via `SET_FILTERS`; derived from `search.queryText` by the toolbar.
   * When no tag service is configured, `filters.search` equals `search.queryText`.
   * When tag parsing is available, `filters.search` contains only the free-text
   * portion and `filters.tags` holds the structured tag filters.
   */
  filters: ActiveFilters;
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

/** Update the search query text. */
interface SetSearchQueryAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY;
  payload: string;
}

/** Update the active filters. */
interface SetFiltersAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_FILTERS;
  payload: ActiveFilters;
}

/** Clear all filters and search text. */
interface ClearFiltersAction {
  type: typeof CONTENT_LIST_ACTIONS.CLEAR_FILTERS;
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
  | SetSearchQueryAction
  | SetFiltersAction
  | ClearFiltersAction
  | SetSortAction
  | { type: typeof CONTENT_LIST_ACTIONS.SET_PAGE_INDEX; payload: { index: number } }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_PAGE_SIZE; payload: { size: number } };

/**
 * Context value provided by `ContentListStateProvider`.
 */
export interface ContentListStateContextValue {
  /** Current state of the content list (client state + query data). */
  state: ContentListState;
  /** Dispatch function for client state updates (search, filters, sort). */
  dispatch: Dispatch<ContentListAction>;
  /** Function to manually refetch items from the data source. */
  refetch: () => void;
}
