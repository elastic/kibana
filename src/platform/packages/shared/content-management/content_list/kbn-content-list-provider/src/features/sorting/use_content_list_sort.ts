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
 * Hook to access and control sorting functionality
 *
 * Use this hook when you need to read or update the sort configuration.
 *
 * @throws Error if used outside ContentListProvider
 * @returns Object containing:
 *   - field: Current sort field name
 *   - direction: Current sort direction ('asc' | 'desc')
 *   - setSort: Function to update the sort configuration
 *
 * @example
 * ```tsx
 * function SortControls() {
 *   const { field, direction, setSort } = useContentListSort();
 *
 *   return (
 *     <EuiSelect
 *       value={`${field}-${direction}`}
 *       onChange={(e) => {
 *         const [newField, newDirection] = e.target.value.split('-');
 *         setSort(newField, newDirection as 'asc' | 'desc');
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
export const useContentListSort = () => {
  const { state, dispatch } = useContentListState();

  const setSort = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SORT, payload: { field, direction } });
    },
    [dispatch]
  );

  return {
    field: state.sort.field,
    direction: state.sort.direction,
    setSort,
  };
};
