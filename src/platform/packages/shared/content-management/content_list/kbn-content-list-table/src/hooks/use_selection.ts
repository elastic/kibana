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
  useContentListSelection,
  type ContentListItem,
} from '@kbn/content-list-provider';

/**
 * Return type for the {@link useSelection} hook.
 */
export interface UseSelectionReturn {
  /**
   * Selection configuration for `EuiBasicTable`'s `selection` prop.
   * Returns `undefined` when selection is not supported (e.g., read-only mode).
   */
  selection?: EuiTableSelectionType<ContentListItem>;
}

/**
 * Hook to integrate content list selection with `EuiBasicTable`.
 *
 * Bridges the provider's selection state with `EuiBasicTable`'s `selection` prop
 * using **controlled mode** (`selected`). This ensures programmatic selection
 * changes (e.g., clearing after delete) are reflected in the table checkboxes.
 *
 * @returns Object containing the `selection` prop for `EuiBasicTable`.
 */
export const useSelection = (): UseSelectionReturn => {
  const { supports } = useContentListConfig();
  const { selectedItems, setSelection } = useContentListSelection();

  const selection: EuiTableSelectionType<ContentListItem> | undefined = useMemo(() => {
    if (!supports.selection) {
      return undefined;
    }

    // TODO: Accept an optional `selectable` predicate from the provider config to
    // support per-row selectability (e.g., permission-gated rows).
    return {
      onSelectionChange: setSelection,
      selected: selectedItems,
      selectable: () => true,
    };
  }, [supports.selection, setSelection, selectedItems]);

  return { selection };
};
