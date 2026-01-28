/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { EuiTableSelectionType } from '@elastic/eui';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSelection,
  type ContentListItem,
} from '@kbn/content-list-provider';

/**
 * Options for the {@link useSelection} hook.
 */
/**
 * Options for the {@link useSelection} hook.
 */
export interface UseSelectionOptions {
  /**
   * Optional filtered items to use instead of provider items.
   * When provided, selection logic uses these items for the current page.
   */
  filteredItems?: ContentListItem[];
}

/**
 * Return type for the {@link useSelection} hook.
 *
 * When selection is enabled and not in read-only mode, returns `EuiTableSelectionType<ContentListItem>`.
 * Otherwise, returns `undefined` to disable selection in the table.
 */
export type UseSelectionResult = EuiTableSelectionType<ContentListItem> | undefined;

/**
 * Hook to build table selection configuration.
 *
 * Integrates with {@link useContentListSelection} from the provider to manage selection state.
 * Handles page-level selection while preserving selections across pages.
 *
 * @param options - Optional configuration including filtered items.
 * @returns Selection configuration for `EuiBasicTable`, or `undefined` if selection is disabled.
 */
export const useSelection = (options?: UseSelectionOptions): UseSelectionResult => {
  const { features, isReadOnly } = useContentListConfig();
  const { selection } = features;
  const { items: providerItems } = useContentListItems();
  const { selectedItems, setSelection } = useContentListSelection();

  // Use filtered items if provided, otherwise fall back to provider items.
  const items = options?.filteredItems ?? providerItems;

  return useMemo(() => {
    // Only enable selection if `actions.selection` is configured and not read-only.
    if (!selection || isReadOnly) {
      return undefined;
    }

    return {
      selectable: () => true, // All items are selectable.
      onSelectionChange: (changedItems) => {
        const updatedSelection = new Set(selectedItems);

        // Remove any selections that belong to the current page.
        items.forEach(({ id }) => {
          updatedSelection.delete(id);
        });

        // Add currently selected rows from this page.
        changedItems.forEach((item) => {
          updatedSelection.add(item.id);
        });

        setSelection(updatedSelection);
      },
      selected: items.filter((item) => selectedItems.has(item.id)),
    };
  }, [selection, isReadOnly, items, selectedItems, setSelection]);
};
