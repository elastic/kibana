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
import type { ContentListItem } from '../../item';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Hook to manage item selection state.
 *
 * Use this hook to implement row selection in tables or item selection in other views.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing:
 *   - `selectedItems`: Set of selected item IDs.
 *   - `selectedCount`: Number of selected items.
 *   - `setSelection`: Function to set the selection (replaces current).
 *   - `toggleSelection`: Function to toggle a single item's selection.
 *   - `clearSelection`: Function to clear all selections.
 *   - `selectAll`: Function to select all items on the current page.
 *   - `isSelected`: Function to check if an item ID is selected.
 *   - `getSelectedItems`: Function to get the full `ContentListItem` objects for selected items.
 *
 * @example
 * ```tsx
 * function TableRow({ item }) {
 *   const { isSelected, toggleSelection } = useContentListSelection();
 *
 *   return (
 *     <tr>
 *       <td>
 *         <input
 *           type="checkbox"
 *           checked={isSelected(item.id)}
 *           onChange={() => toggleSelection(item.id)}
 *         />
 *       </td>
 *     </tr>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function BulkActions() {
 *   const { selectedCount, getSelectedItems, clearSelection } = useContentListSelection();
 *   const { selection } = useContentListConfig();
 *
 *   if (selectedCount === 0) return null;
 *
 *   return (
 *     <div>
 *       <span>{selectedCount} selected</span>
 *       <EuiButton onClick={() => selection?.onSelectionDelete?.(getSelectedItems())}>
 *         Delete selected
 *       </EuiButton>
 *       <EuiButtonEmpty onClick={clearSelection}>Clear</EuiButtonEmpty>
 *     </div>
 *   );
 * }
 * ```
 */
export const useContentListSelection = () => {
  const { state, dispatch } = useContentListState();
  const { selectedItems } = state;

  const setSelection = useCallback(
    (selection: Set<string>) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_SELECTION, payload: selection });
    },
    [dispatch]
  );

  const toggleSelection = useCallback(
    (id: string) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.TOGGLE_SELECTION, payload: id });
    },
    [dispatch]
  );

  const clearSelection = useCallback(() => {
    dispatch({ type: CONTENT_LIST_ACTIONS.CLEAR_SELECTION });
  }, [dispatch]);

  const selectAll = useCallback(() => {
    // Build selection from current items and use `SET_SELECTION`.
    const allItemIds = new Set(state.items.map((item) => item.id));
    dispatch({ type: CONTENT_LIST_ACTIONS.SET_SELECTION, payload: allItemIds });
  }, [dispatch, state.items]);

  const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

  const getSelectedItems = useCallback((): ContentListItem[] => {
    return state.items.filter((item) => selectedItems.has(item.id));
  }, [selectedItems, state.items]);

  return {
    selectedItems,
    selectedCount: selectedItems.size,
    setSelection,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    getSelectedItems,
  };
};
