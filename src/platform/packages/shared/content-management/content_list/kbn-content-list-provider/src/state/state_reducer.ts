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
 * State reducer for client-controlled state.
 *
 * Handles only user-driven state mutations (filters, sort).
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

    default:
      return state;
  }
};
