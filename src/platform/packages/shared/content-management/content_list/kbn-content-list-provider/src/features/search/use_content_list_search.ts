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
 * Hook to access and control the search query text.
 *
 * Returns the raw `EuiSearchBar` query text (`search.queryText`) and a setter.
 * When search is disabled via `features.search: false`, `setSearch` becomes a no-op
 * and `isSupported` returns `false`.
 *
 * **Important**: `setSearch` only updates the displayed query text. It does
 * **not** update `filters` (which drives data fetching). Callers must also
 * dispatch `SET_FILTERS` so the query actually refetches. `ContentListToolbar`
 * handles this automatically — use this hook directly only when building a
 * custom search UI.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing `search` text, `setSearch` function, and `isSupported` flag.
 *
 * @example
 * ```tsx
 * const SearchInput = () => {
 *   const { search, setSearch, isSupported } = useContentListSearch();
 *   const { dispatch } = useContentListState();
 *
 *   if (!isSupported) return null;
 *
 *   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const text = e.target.value;
 *     setSearch(text);
 *     // Also update filters so the query refetches.
 *     dispatch({
 *       type: CONTENT_LIST_ACTIONS.SET_FILTERS,
 *       payload: { search: text.trim() || undefined },
 *     });
 *   };
 *
 *   return (
 *     <EuiFieldSearch
 *       value={search}
 *       onChange={handleChange}
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
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY, payload: text });
    },
    [dispatch, supports.search]
  );

  return {
    search: state.search.queryText,
    setSearch,
    isSupported: supports.search,
  };
};
