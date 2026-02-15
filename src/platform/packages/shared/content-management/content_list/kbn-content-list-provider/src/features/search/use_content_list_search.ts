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
import { useContentListConfig } from '../../context';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Return type for the {@link useContentListSearch} hook.
 */
export interface UseContentListSearchReturn {
  /** Current search text (empty string when no search is active). */
  search: string;
  /** Updates the search text. No-op if search is disabled. */
  setSearch: (text: string) => void;
  /** Whether search is supported (enabled via features). */
  isSupported: boolean;
}

/**
 * Hook to access and control search functionality.
 *
 * Use this hook when you need to read or update the search text.
 * When search is disabled via `features.search: false`, `setSearch` becomes a no-op
 * and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing `search` text, `setSearch` function, and `isSupported` flag.
 *
 * @example
 * ```tsx
 * const SearchInput = () => {
 *   const { search, setSearch, isSupported } = useContentListSearch();
 *
 *   if (!isSupported) return null;
 *
 *   return (
 *     <EuiFieldSearch
 *       value={search}
 *       onChange={(e) => setSearch(e.target.value)}
 *       placeholder="Search..."
 *     />
 *   );
 * };
 * ```
 */
export const useContentListSearch = (): UseContentListSearchReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const setSearch = useCallback(
    (text: string) => {
      if (!supports.search) {
        return;
      }
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SEARCH, payload: { search: text } });
    },
    [dispatch, supports.search]
  );

  return {
    search: state.filters.search ?? '',
    setSearch,
    isSupported: supports.search,
  };
};
