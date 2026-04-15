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
 * Return type for the {@link useContentListSearch} hook.
 */
export interface UseContentListSearchReturn {
  /** The query text — source of truth for the search bar. */
  queryText: string;
  /**
   * Update query from an already-parsed EUI Query object (search bar typing).
   * Stores `query.text` as the new queryText.
   */
  setQueryFromEuiQuery: (euiQuery: Query) => void;
  /** Update query from raw text (programmatic input, URL params). */
  setQueryFromText: (text: string) => void;
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
    (euiQuery: Query) => {
      if (!supports.search) {
        return;
      }
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: euiQuery.text },
      });
    },
    [dispatch, supports.search]
  );

  const setQueryFromText = useCallback(
    (text: string) => {
      if (!supports.search) {
        return;
      }
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: text },
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
