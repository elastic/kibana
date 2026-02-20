/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListClientState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';

/**
 * Default selection state.
 */
export const DEFAULT_SELECTION = {
  selectedIds: [] as string[],
};

/**
 * State reducer for client-controlled state.
 *
 * Handles user-driven state mutations (search, filters, sort, pagination, selection).
 * Query data (items, loading, error) is managed by React Query directly.
 *
 * Selection is cleared whenever search, filters, sort, or pagination change so that
 * `selectedIds` never references items the user can no longer see.
 *
 * @param state - Current client state.
 * @param action - Action to apply.
 * @returns New client state.
 */
export const reducer = (
  state: ContentListClientState,
  action: ContentListAction
): ContentListClientState => {
  switch (action.type) {
    case CONTENT_LIST_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: { queryText: action.payload.queryText },
        filters: action.payload.filters,
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: { ...DEFAULT_FILTERS },
        search: { queryText: '' },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_INDEX:
      return {
        ...state,
        page: { ...state.page, index: action.payload.index },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_SIZE:
      return {
        ...state,
        page: { index: 0, size: action.payload.size },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_SELECTION:
      return {
        ...state,
        selection: {
          selectedIds: action.payload.ids,
        },
      };

    case CONTENT_LIST_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selection: { ...DEFAULT_SELECTION },
      };

    default:
      return state;
  }
};
