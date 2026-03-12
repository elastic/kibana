/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import type { UseContentListFiltersReturn } from './types';

/**
 * Hook to read the current filter state and clear all filters.
 *
 * Reads the current `filters` from provider state. Filters are always updated
 * atomically with the search bar query text via `SET_SEARCH` — use
 * {@link useContentListSearch}'s `setSearch` to change filters programmatically,
 * or {@link useTagFilterToggle} to toggle a single tag.
 *
 * @returns A {@link UseContentListFiltersReturn} object.
 *
 * @example
 * ```tsx
 * const { filters, clearFilters } = useContentListFilters();
 *
 * // Read current filters.
 * const { search, tag, type, ...otherFilters } = filters;
 *
 * // Clear all filters and search text.
 * clearFilters();
 * ```
 */
export const useContentListFilters = (): UseContentListFiltersReturn => {
  const { state, dispatch } = useContentListState();

  const clearFilters = useCallback(() => {
    dispatch({ type: CONTENT_LIST_ACTIONS.CLEAR_FILTERS });
  }, [dispatch]);

  return {
    filters: state.filters,
    clearFilters,
  };
};
