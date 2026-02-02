/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS } from './types';

/**
 * State reducer for `ContentListProvider`.
 *
 * Handles all state mutations with immutable updates.
 *
 * @param state - Current state.
 * @param action - Action to apply.
 * @returns New state.
 */
export const reducer = (state: ContentListState, action: ContentListAction): ContentListState => {
  switch (action.type) {
    case CONTENT_LIST_ACTIONS.SET_ITEMS:
      return {
        ...state,
        items: action.payload.items,
        totalItems: action.payload.totalItems,
        error: undefined,
      };

    case CONTENT_LIST_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case CONTENT_LIST_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
      };

    default:
      return state;
  }
};
