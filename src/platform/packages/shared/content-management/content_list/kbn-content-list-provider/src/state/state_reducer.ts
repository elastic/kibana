/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListClientState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS } from './types';

/**
 * Default state for the delete feature.
 *
 * Spread into `initialClientState` by {@link ContentListStateProvider}.
 */
export const DEFAULT_DELETE_STATE = {
  deleteRequest: null,
  isDeleting: false,
} as const;

/**
 * State reducer for client-controlled state.
 *
 * Handles only user-driven state mutations (filters, sort, delete).
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
    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
      };

    case CONTENT_LIST_ACTIONS.REQUEST_DELETE:
      return {
        ...state,
        deleteRequest: { items: action.payload.items },
        isDeleting: false,
      };

    case CONTENT_LIST_ACTIONS.CONFIRM_DELETE_START:
      return {
        ...state,
        isDeleting: true,
      };

    case CONTENT_LIST_ACTIONS.CANCEL_DELETE:
      return {
        ...state,
        deleteRequest: null,
        isDeleting: false,
      };

    // Identical to `CANCEL_DELETE` for now; will diverge when wired to
    // selection clearing and success notifications.
    case CONTENT_LIST_ACTIONS.DELETE_COMPLETED:
      return {
        ...state,
        deleteRequest: null,
        isDeleting: false,
      };

    default:
      return state;
  }
};
