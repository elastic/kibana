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
import type { ActiveFilters } from '../features/filtering';
import type { IdentityResolver } from '../features/search';

/**
 * Action type constants for state reducer.
 *
 * These constants are used internally by the state management system.
 * Most consumers should use the feature hooks (`useContentListSearch`, etc.)
 * rather than dispatching actions directly.
 *
 * @internal
 */
export const CONTENT_LIST_ACTIONS = {
  // Data actions.
  /** Set the loaded items and total count. */
  SET_ITEMS: 'SET_ITEMS',
  /** Set the loading state. */
  SET_LOADING: 'SET_LOADING',
  /** Set the error state. */
  SET_ERROR: 'SET_ERROR',
  // Search actions.
  /** Update the search query text. */
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  /** Set the search error. */
  SET_SEARCH_ERROR: 'SET_SEARCH_ERROR',
  /** Clear the search query. */
  CLEAR_SEARCH_QUERY: 'CLEAR_SEARCH_QUERY',
  // Filter actions.
  /** Update the active filters. */
  SET_FILTERS: 'SET_FILTERS',
  /** Clear all filters. */
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  // Sort actions.
  /** Update the sort configuration. */
  SET_SORT: 'SET_SORT',
  // Pagination actions.
  /** Update the pagination state. */
  SET_PAGE: 'SET_PAGE',
  // Selection actions.
  /** Set the selected items. */
  SET_SELECTION: 'SET_SELECTION',
  /** Toggle selection for a single item. */
  TOGGLE_SELECTION: 'TOGGLE_SELECTION',
  /** Clear all selections. */
  CLEAR_SELECTION: 'CLEAR_SELECTION',
} as const;

/**
 * Default filter state used when clearing filters or initializing state.
 * Provides a consistent shape that feature hooks can rely on.
 */
export const DEFAULT_FILTERS: ActiveFilters = {
  search: undefined,
  tags: {
    include: [],
    exclude: [],
  },
  users: [],
  starredOnly: false,
};

/**
 * Core state structure containing all dynamic data.
 * Items are stored as `ContentListItem` (standardized format) after transformation.
 */
export interface ContentListState {
  /** Currently loaded items (transformed for rendering). */
  items: ContentListItem[];
  /** Total number of items matching the current query (for pagination). */
  totalItems: number;
  /** Whether data is currently being fetched. */
  isLoading: boolean;
  /** Error from the most recent fetch attempt. */
  error?: Error;

  /** Search state - query text is the source of truth (serializable). */
  search: {
    /** Search query text including filter syntax (e.g., `tag:foo search text`). */
    queryText: string;
    /** Error from parsing the query. */
    error?: Error;
  };

  /** Filter state - currently applied filters (merged from state and query-derived). */
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
    /** Zero-based page index. */
    index: number;
    /** Number of items per page. */
    size: number;
  };

  /** Set of selected item IDs. */
  selectedItems: Set<string>;

  /** When `true`, user actions are no-ops. */
  isReadOnly: boolean;
}

/**
 * Union type of all possible state actions.
 *
 * Each action corresponds to a state update operation. Items in payloads
 * are always `ContentListItem` (standardized format) after transformation.
 *
 * @internal Used by the state reducer and dispatch function.
 */
export type ContentListAction =
  // Data actions
  | {
      type: typeof CONTENT_LIST_ACTIONS.SET_ITEMS;
      payload: { items: ContentListItem[]; totalItems: number };
    }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_LOADING; payload: boolean }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_ERROR; payload: Error | undefined }
  // Search actions
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY; payload: string }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SEARCH_ERROR; payload: Error | undefined }
  | { type: typeof CONTENT_LIST_ACTIONS.CLEAR_SEARCH_QUERY }
  // Filter actions
  | { type: typeof CONTENT_LIST_ACTIONS.SET_FILTERS; payload: ActiveFilters }
  | { type: typeof CONTENT_LIST_ACTIONS.CLEAR_FILTERS }
  // Sort actions
  | {
      type: typeof CONTENT_LIST_ACTIONS.SET_SORT;
      payload: { field: string; direction: 'asc' | 'desc' };
    }
  // Pagination actions
  | { type: typeof CONTENT_LIST_ACTIONS.SET_PAGE; payload: { index: number; size: number } }
  // Selection actions
  | { type: typeof CONTENT_LIST_ACTIONS.SET_SELECTION; payload: Set<string> }
  | { type: typeof CONTENT_LIST_ACTIONS.TOGGLE_SELECTION; payload: string }
  | { type: typeof CONTENT_LIST_ACTIONS.CLEAR_SELECTION };

/**
 * Context value provided by `ContentListStateProvider`.
 */
export interface ContentListStateContextValue {
  /** Current state of the content list. */
  state: ContentListState;
  /** Dispatch function for state updates. */
  dispatch: Dispatch<ContentListAction>;
  /** Function to manually refetch items from the data source. */
  refetch: () => void;
  /**
   * Identity resolver for createdBy filter deduplication.
   * Maps between display values (usernames/emails) and canonical values (UIDs).
   */
  createdByResolver: IdentityResolver;
}
