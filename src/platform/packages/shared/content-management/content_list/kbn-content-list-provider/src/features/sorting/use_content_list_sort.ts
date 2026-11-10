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
import { setPersistedSort } from './persist';
import type { SortDirection } from './types';

/**
 * Return type for the `useContentListSort` hook.
 */
export interface UseContentListSortReturn {
  /** Current sort field name. */
  field: string;
  /** Current sort direction. */
  direction: SortDirection;
  /** Updates the sort configuration and persists it to `localStorage`. No-op if sorting is disabled. */
  setSort: (field: string, direction: SortDirection) => void;
  /** Whether sorting is supported (enabled via features). */
  isSupported: boolean;
}

/**
 * Hook to access and control sorting functionality.
 *
 * Use this hook when you need to read or update the sort configuration.
 * When sorting is disabled via `features.sorting: false`, `setSort` becomes a no-op
 * and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing field, direction, setSort function, and isSupported flag.
 *
 * @example
 * ```tsx
 * function SortControls() {
 *   const { field, direction, setSort, isSupported } = useContentListSort();
 *
 *   if (!isSupported) return null;
 *
 *   return (
 *     <EuiSelect
 *       value={`${field}-${direction}`}
 *       onChange={(e) => {
 *         const [newField, newDirection] = e.target.value.split('-');
 *         setSort(newField, newDirection as SortDirection);
 *       }}
 *       options={[
 *         { value: 'title-asc', text: 'Title A-Z' },
 *         { value: 'title-desc', text: 'Title Z-A' },
 *         { value: 'updatedAt-desc', text: 'Recently updated' },
 *       ]}
 *     />
 *   );
 * }
 * ```
 */
export const useContentListSort = (): UseContentListSortReturn => {
  const { supports, queryKeyScope } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const setSort = useCallback(
    (field: string, direction: SortDirection) => {
      if (!supports.sorting) {
        return;
      }
      setPersistedSort(queryKeyScope, { field, direction });
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SORT, payload: { field, direction } });
    },
    [dispatch, supports.sorting, queryKeyScope]
  );

  return {
    field: state.sort.field,
    direction: state.sort.direction,
    setSort,
    isSupported: supports.sorting,
  };
};
