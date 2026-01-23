/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';

/**
 * First page index (0-based pagination).
 * Used when resetting pagination on search/filter/sort changes.
 */
const FIRST_PAGE_INDEX = 0;

/**
 * State reducer for `ContentListProvider`.
 * Handles all state mutations with immutable updates.
 * Automatically resets page to 0 on search/filter/sort changes.
 *
 * @param state - Current state.
 * @param action - Action to apply.
 * @returns New state.
 */
export const reducer = (state: ContentListState, action: ContentListAction): ContentListState => {
  switch (action.type) {
    // Data mutations.
    case CONTENT_LIST_ACTIONS.SET_ITEMS:
      return {
        ...state,
        items: action.payload.items,
        totalItems: action.payload.totalItems,
        isLoading: false,
        error: undefined,
      };

    case CONTENT_LIST_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case CONTENT_LIST_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    // Search mutations.
    case CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY:
      return {
        ...state,
        search: { ...state.search, queryText: action.payload },
        page: { ...state.page, index: FIRST_PAGE_INDEX }, // Reset to first page on search
      };

    case CONTENT_LIST_ACTIONS.SET_SEARCH_ERROR:
      return {
        ...state,
        search: { ...state.search, error: action.payload },
      };

    // Filter mutations.
    case CONTENT_LIST_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: action.payload,
        page: { ...state.page, index: FIRST_PAGE_INDEX }, // Reset to first page on filter change.
      };

    case CONTENT_LIST_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: { ...DEFAULT_FILTERS },
        page: { ...state.page, index: FIRST_PAGE_INDEX }, // Reset to first page.
      };

    case CONTENT_LIST_ACTIONS.CLEAR_SEARCH_QUERY:
      return {
        ...state,
        search: { ...state.search, queryText: '', error: undefined },
        page: { ...state.page, index: FIRST_PAGE_INDEX }, // Reset to first page on search clear.
      };

    // Sort mutations.
    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
        page: { ...state.page, index: FIRST_PAGE_INDEX }, // Reset to first page on sort change.
      };

    // Pagination mutations.
    case CONTENT_LIST_ACTIONS.SET_PAGE:
      return {
        ...state,
        page: {
          index: action.payload.index,
          size: action.payload.size,
        },
      };

    // Selection mutations (no-op in read-only mode).
    case CONTENT_LIST_ACTIONS.SET_SELECTION:
      if (state.isReadOnly) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('[ContentListProvider] Selection action ignored: list is in read-only mode');
        }
        return state;
      }

      return { ...state, selectedItems: action.payload };

    case CONTENT_LIST_ACTIONS.TOGGLE_SELECTION:
      if (state.isReadOnly) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('[ContentListProvider] Selection action ignored: list is in read-only mode');
        }
        return state;
      }

      const newSelection = new Set(state.selectedItems);

      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }

      return { ...state, selectedItems: newSelection };

    case CONTENT_LIST_ACTIONS.CLEAR_SELECTION:
      if (state.isReadOnly) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('[ContentListProvider] Selection action ignored: list is in read-only mode');
        }
        return state;
      }
      return { ...state, selectedItems: new Set() };

    default:
      return state;
  }
};
