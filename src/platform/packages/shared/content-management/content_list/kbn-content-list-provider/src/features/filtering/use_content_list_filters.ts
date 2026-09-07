/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef } from 'react';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import { useActiveFilters, useQueryModel } from '../../query_model';
import type { UseContentListFiltersReturn } from './types';

/**
 * Hook to read the current filter state and clear all filters.
 *
 * Derives `ActiveFilters` from `queryText` via `useActiveFilters`.
 *
 * `clearFilters` strips structured filter/flag clauses from `queryText`
 * while preserving free-text search. For example, clearing
 * `"tag:production is:starred my search"` yields `"my search"`.
 *
 * @returns A {@link UseContentListFiltersReturn} object.
 */
export const useContentListFilters = (): UseContentListFiltersReturn => {
  const { state, dispatch } = useContentListState();

  const filters = useActiveFilters();
  const model = useQueryModel(state.queryText);

  // Ref keeps `clearFilters` referentially stable (depends only on
  // `dispatch`) while reading the latest search text at call time.
  const searchRef = useRef(model.search);
  searchRef.current = model.search;

  const clearFilters = useCallback(() => {
    dispatch({
      type: CONTENT_LIST_ACTIONS.SET_QUERY,
      payload: { queryText: searchRef.current },
    });
  }, [dispatch]);

  return {
    filters,
    clearFilters,
  };
};
