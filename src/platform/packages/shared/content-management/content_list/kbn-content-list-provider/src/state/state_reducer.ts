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
 * State reducer for client-controlled state.
 *
 * Handles user-driven state mutations (search, filters, sort, pagination).
 * Query data (items, loading, error) is managed by React Query directly.
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
        // Reset to first page when search changes to avoid stale page offsets.
        page: { ...state.page, index: 0 },
      };

    case CONTENT_LIST_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: { ...DEFAULT_FILTERS },
        search: { queryText: '' },
        // Reset to first page when filters are cleared to avoid stale page offsets.
        page: { ...state.page, index: 0 },
      };

    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
        // Reset to first page when sort changes to avoid stale page offsets.
        page: { ...state.page, index: 0 },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_INDEX:
      return {
        ...state,
        page: { ...state.page, index: action.payload.index },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_SIZE:
      return {
        ...state,
        page: { index: 0, size: action.payload.size },
      };

    default:
      return state;
  }
};
