/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { Query } from '@elastic/eui';
import { useContentListState } from '../../state/use_content_list_state';
import { useContentListConfig } from '../../context';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import { useFieldDefinitions } from '../../query_model';

/**
 * Source of a public query update.
 *
 * - `'typing'` — search-box keystrokes; `ContentListUrlSync` uses
 *   `history.replace` so the back stack does not grow one entry per keystroke.
 * - `'filter'` — committed filter actions (toggles, clears, custom-component
 *   filter `onChange`); `ContentListUrlSync` uses `history.push` so back/forward
 *   navigates between committed filter states.
 *
 * The internal `'url'` source — used when `ContentListUrlSync` rehydrates
 * state from `history.listen` events — is intentionally not surfaced here.
 * Callers that need URL-driven dispatch should dispatch `SET_QUERY` directly.
 */
export type QuerySetterSource = 'typing' | 'filter';

/**
 * Return type for the {@link useContentListSearch} hook.
 */
export interface UseContentListSearchReturn {
  /** The query text — source of truth for the search bar. */
  queryText: string;
  /**
   * Update query from an already-parsed EUI Query object (search bar typing).
   * Stores `query.text` as the new `queryText`. Defaults to `source: 'typing'`.
   */
  setQueryFromEuiQuery: (euiQuery: Query, source?: QuerySetterSource) => void;
  /**
   * Update query from raw text (programmatic input). Defaults to
   * `source: 'typing'`.
   */
  setQueryFromText: (text: string, source?: QuerySetterSource) => void;
  /** Whether search is supported (enabled via features). */
  isSupported: boolean;
  /**
   * Registered field names from field definitions.
   * Pass to `EuiSearchBar`'s `box.schema` so it recognizes filter fields.
   */
  fieldNames: string[];
}

/**
 * Hook to access and control the search query.
 *
 * `queryText` is the source of truth — read directly from state.
 * The structured model ({@link ContentListQueryModel}) is derived on-demand
 * by consumers that need it (via `useQueryModel`).
 */
export const useContentListSearch = (): UseContentListSearchReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();
  const { fieldNames } = useFieldDefinitions();

  const queryText = state.queryText;

  const setQueryFromEuiQuery = useCallback(
    (euiQuery: Query, source: QuerySetterSource = 'typing') => {
      if (!supports.search) {
        return;
      }
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: euiQuery.text, source },
      });
    },
    [dispatch, supports.search]
  );

  const setQueryFromText = useCallback(
    (text: string, source: QuerySetterSource = 'typing') => {
      if (!supports.search) {
        return;
      }
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: text, source },
      });
    },
    [dispatch, supports.search]
  );

  return {
    queryText,
    setQueryFromEuiQuery,
    setQueryFromText,
    isSupported: supports.search,
    fieldNames,
  };
};
