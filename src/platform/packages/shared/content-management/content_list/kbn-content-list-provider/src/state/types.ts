/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch } from 'react';
import type { ActiveFilters, FilterCounts, UserFilter } from '../datasource';
import type { ContentListItem } from '../item';
import type { CreatorsList } from '../features';

/**
 * Action type constants for state reducer.
 */
export const CONTENT_LIST_ACTIONS = {
  /** Atomically update the search query text and parsed filters. */
  SET_SEARCH: 'SET_SEARCH',
  /** Clear all filters and reset query text. */
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  /** Toggle a value's include/exclude state for any filter dimension, updating filters and query text atomically. */
  TOGGLE_FILTER: 'TOGGLE_FILTER',
  /** Update only the `user` portion of `ActiveFilters`. */
  SET_USER_FILTER: 'SET_USER_FILTER',
  /** Toggle a single user's email in the query text, updating the `createdBy` clause atomically. */
  TOGGLE_USER_FILTER: 'TOGGLE_USER_FILTER',
  /** Replace the entire `ActiveFilters` object. */
  SET_FILTERS: 'SET_FILTERS',
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
 * Default filter state.
 */
export const DEFAULT_FILTERS: ActiveFilters = {};

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
   * Always updated atomically with `search.queryText` via `SET_SEARCH`.
   * When no tag service is configured, `filters.search` equals `search.queryText`.
   * When tag parsing is available, `filters.search` contains only the free-text
   * portion and `filters.tag`, `filters.custom`, etc. hold structured filters.
   * The `user` field is always applied client-side and never sent to the server.
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
  /** Currently loaded items (after client-side user filtering). */
  items: ContentListItem[];
  /**
   * Summary of all unique creators from the unfiltered query result.
   *
   * Derived before client-side user filtering so the creator list shown in
   * the filter popover never shrinks when a filter is active.
   */
  allCreators: CreatorsList;
  /** Total number of items matching the current query (for pagination). */
  totalItems: number;
  /**
   * Per-filter counts from the full result set. See {@link FindItemsResult.counts}.
   */
  counts?: Record<string, FilterCounts>;
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

/** Atomically update both the query text and parsed filters. */
interface SetSearchAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_SEARCH;
  payload: { queryText: string; filters: ActiveFilters };
}

/** Clear all filters and search text. */
interface ClearFiltersAction {
  type: typeof CONTENT_LIST_ACTIONS.CLEAR_FILTERS;
}

/**
 * Toggle a value's include/exclude state for any filter dimension.
 *
 * Regular call (`withModifierKey: false`): toggles `valueId` in the **include** list.
 * Modifier call (`withModifierKey: true`): toggles `valueId` in the **exclude** list.
 * In both cases the opposite list drops `valueId` if present.
 * The reducer updates `filters` and `search.queryText` atomically
 * using `valueName` as the EUI `Query` field value (the display label in query text).
 */
interface ToggleFilterAction {
  type: typeof CONTENT_LIST_ACTIONS.TOGGLE_FILTER;
  payload: { filterId: string; valueId: string; valueName: string; withModifierKey: boolean };
}

/** Update only the `user` portion of active filters. */
interface SetUserFilterAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_USER_FILTER;
  payload: UserFilter | undefined;
}

/**
 * Toggle a single user's email in the `createdBy` query clause.
 *
 * Checks whether `uid` is present in `filters.user.uid` to decide add vs remove.
 * Updates both `search.queryText` and `filters.user` atomically.
 * The renderer's `useEffect` syncs `filters.user` again when the query prop changes,
 * but the reducer sets it directly so client-side filtering reflects immediately.
 */
interface ToggleUserFilterAction {
  type: typeof CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER;
  payload: { uid: string; queryValue: string };
}

/** Replace the entire active filters object. */
interface SetFiltersAction {
  type: typeof CONTENT_LIST_ACTIONS.SET_FILTERS;
  payload: ActiveFilters;
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
  | SetSearchAction
  | ClearFiltersAction
  | ToggleFilterAction
  | SetUserFilterAction
  | ToggleUserFilterAction
  | SetFiltersAction
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
  /** Function to manually refetch items from the data source. */
  refetch: () => void;
}
