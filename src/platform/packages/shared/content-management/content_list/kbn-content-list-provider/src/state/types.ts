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
  // Data actions.
  SET_ITEMS: 'SET_ITEMS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  // Sort actions.
  SET_SORT: 'SET_SORT',
} as const;

/**
 * Default filter state.
 */
export const DEFAULT_FILTERS: ActiveFilters = {
  search: undefined,
};

/**
 * Core state structure containing all dynamic data.
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
 * Union type of all possible state actions.
 *
 * @internal Used by the state reducer and dispatch function.
 */
export type ContentListAction =
  // Data actions.
  | {
      type: typeof CONTENT_LIST_ACTIONS.SET_ITEMS;
      payload: { items: ContentListItem[]; totalItems: number };
    }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_LOADING; payload: boolean }
  | { type: typeof CONTENT_LIST_ACTIONS.SET_ERROR; payload: Error | undefined }
  // Sort actions.
  | {
      type: typeof CONTENT_LIST_ACTIONS.SET_SORT;
      payload: { field: string; direction: 'asc' | 'desc' };
    };

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
}
