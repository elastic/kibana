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
import { useContentListConfig } from '../../context';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import { isPaginationConfig } from '../types';
import { setPersistedPageSize } from './persist';
import { DEFAULT_PAGE_SIZE_OPTIONS } from './types';
import type { PaginationConfig } from './types';

/**
 * Return type for the {@link useContentListPagination} hook.
 */
export interface UseContentListPaginationReturn {
  /** Whether pagination is supported (enabled via features). */
  isSupported: boolean;
  /** Current page index (0-based). */
  pageIndex: number;
  /** Current number of items per page. */
  pageSize: number;
  /** Total number of items matching the current query. */
  totalItems: number;
  /** Total number of pages. */
  pageCount: number;
  /** Available page size options for the dropdown. */
  pageSizeOptions: number[];
  /** Navigate to a specific page index. No-op if pagination is disabled. */
  setPageIndex: (index: number) => void;
  /** Change the page size (resets to page 0). No-op if pagination is disabled. Persists to `localStorage`. */
  setPageSize: (size: number) => void;
}

/**
 * Resolve `pageSizeOptions` from the features config.
 *
 * Returns a defensive copy to prevent consumers from mutating shared configuration
 * or the {@link DEFAULT_PAGE_SIZE_OPTIONS} constant.
 */
const resolvePageSizeOptions = (pagination?: PaginationConfig | boolean): number[] => {
  if (isPaginationConfig(pagination) && pagination.pageSizeOptions) {
    return [...pagination.pageSizeOptions];
  }
  return [...DEFAULT_PAGE_SIZE_OPTIONS];
};

/**
 * Hook to access and control pagination functionality.
 *
 * Use this hook when you need to read or update the current page.
 * When pagination is disabled via `features.pagination: false`, `setPageIndex`
 * and `setPageSize` become no-ops and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing pagination state and control functions.
 *
 * @example
 * ```tsx
 * const { pageIndex, pageSize, totalItems, pageCount, setPageIndex, setPageSize } =
 *   useContentListPagination();
 *
 * return (
 *   <EuiTablePagination
 *     activePage={pageIndex}
 *     itemsPerPage={pageSize}
 *     pageCount={pageCount}
 *     onChangePage={setPageIndex}
 *     onChangeItemsPerPage={setPageSize}
 *   />
 * );
 * ```
 */
export const useContentListPagination = (): UseContentListPaginationReturn => {
  const { supports, features, queryKeyScope } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const pageSizeOptions = useMemo(
    () => resolvePageSizeOptions(features.pagination),
    [features.pagination]
  );

  const { totalItems } = state;
  const { index: pageIndex, size: pageSize } = state.page;

  const pageCount = useMemo(
    () => (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0),
    [totalItems, pageSize]
  );

  const setPageIndex = useCallback(
    (index: number) => {
      if (!supports.pagination) {
        return;
      }
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_PAGE_INDEX, payload: { index } });
    },
    [dispatch, supports.pagination]
  );

  const setPageSize = useCallback(
    (size: number) => {
      if (!supports.pagination) {
        return;
      }
      setPersistedPageSize(queryKeyScope, size);
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_PAGE_SIZE, payload: { size } });
    },
    [dispatch, supports.pagination, queryKeyScope]
  );

  return {
    isSupported: supports.pagination,
    pageIndex,
    pageSize,
    totalItems,
    pageCount,
    pageSizeOptions,
    setPageIndex,
    setPageSize,
  };
};
