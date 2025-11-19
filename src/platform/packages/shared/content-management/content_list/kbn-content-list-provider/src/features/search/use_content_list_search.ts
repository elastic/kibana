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

/**
 * Hook to access and control search functionality
 *
 * The search query text is stored as a serializable string.
 * Tags, starred, and other field-based filters can be included in the query text
 * using EuiSearchBar's query syntax (e.g., "tag:important is:starred search text").
 *
 * @throws Error if used outside ContentListProvider
 * @returns Object containing:
 *   - queryText: Current search query text
 *   - error: Error if search failed
 *   - setSearch: Function to update the search query text
 *   - clearSearch: Function to clear the search
 *
 * @example
 * ```tsx
 * function SearchBox() {
 *   const { queryText, setSearch } = useContentListSearch();
 *
 *   return (
 *     <EuiSearchBar
 *       query={queryText}
 *       onChange={({ query }) => setSearch(query?.text ?? '')}
 *     />
 *   );
 * }
 * ```
 */
export const useContentListSearch = () => {
  const { state, dispatch } = useContentListState();

  /**
   * Set the search query text.
   */
  const setSearch = useCallback(
    (queryText: string) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SEARCH_QUERY, payload: queryText });
    },
    [dispatch]
  );

  /**
   * Clear the search query.
   */
  const clearSearch = useCallback(() => {
    dispatch({ type: CONTENT_LIST_ACTIONS.CLEAR_SEARCH_QUERY });
  }, [dispatch]);

  return {
    queryText: state.search.queryText,
    error: state.search.error,
    setSearch,
    clearSearch,
  };
};
