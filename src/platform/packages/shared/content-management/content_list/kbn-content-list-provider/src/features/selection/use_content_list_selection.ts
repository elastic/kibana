/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { ContentListItem } from '../../item';
import { useContentListState } from '../../state/use_content_list_state';
import { useContentListConfig } from '../../context';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import type { UseContentListSelectionReturn } from './types';

/**
 * Hook to access and control item selection.
 *
 * Provides the current selection state and functions to modify it.
 * When selection is disabled (via `features.selection: false` or `isReadOnly`),
 * `setSelection` and `clearSelection` become no-ops and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing selection state, mutation functions, and support flag.
 *
 * @example
 * ```tsx
 * const { selectedItems, selectedCount, clearSelection, isSupported } = useContentListSelection();
 *
 * if (!isSupported) return null;
 *
 * return (
 *   <div>
 *     {selectedCount} items selected
 *     <button onClick={clearSelection}>Clear</button>
 *   </div>
 * );
 * ```
 */
export const useContentListSelection = (): UseContentListSelectionReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const { selectedIds } = state.selection;
  const { items } = state;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Only resolves against the currently loaded `items` array. Selection is
  // automatically cleared by the reducer when search, filters, sort, or
  // pagination change, so stale cross-page IDs should not accumulate.
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet]
  );

  const isSelected = useCallback((id: string) => selectedIdSet.has(id), [selectedIdSet]);

  const setSelection = useCallback(
    (selectedItemsList: ContentListItem[]) => {
      if (!supports.selection) {
        return;
      }
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_SELECTION,
        payload: { ids: selectedItemsList.map((item) => item.id) },
      });
    },
    [dispatch, supports.selection]
  );

  const clearSelection = useCallback(() => {
    if (!supports.selection) {
      return;
    }
    dispatch({ type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION });
  }, [dispatch, supports.selection]);

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.length,
    isSelected,
    setSelection,
    clearSelection,
    isSupported: supports.selection,
  };
};
