/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Hook to access and control pagination functionality
 *
 * Use this hook when you need to read or update the pagination state.
 *
 * @throws Error if used outside ContentListProvider
 * @returns Object containing:
 *   - index: Current page index (0-based)
 *   - size: Current page size
 *   - totalPages: Total number of pages based on totalItems
 *   - setPage: Function to update the current page
 *
 * @example
 * ```tsx
 * function PaginationControls() {
 *   const { index, size, totalPages, setPage } = useContentListPagination();
 *
 *   return (
 *     <EuiPagination
 *       pageCount={totalPages}
 *       activePage={index}
 *       onPageClick={(page) => setPage(page, size)}
 *     />
 *   );
 * }
 * ```
 */
export const useContentListPagination = () => {
  const { state, dispatch } = useContentListState();

  const setPage = useCallback(
    (index: number, size: number) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_PAGE, payload: { index, size } });
    },
    [dispatch]
  );

  const totalPages = useMemo(() => {
    return Math.ceil(state.totalItems / state.page.size);
  }, [state.totalItems, state.page.size]);

  return {
    index: state.page.index,
    size: state.page.size,
    totalPages,
    setPage,
  };
};
