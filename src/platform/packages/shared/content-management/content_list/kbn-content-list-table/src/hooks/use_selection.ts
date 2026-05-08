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
  isSelectionConfig,
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
 * When `features.selection` is a {@link SelectionConfig}, its `selectable` and
 * `selectableMessage` callbacks are forwarded to EUI so consumers can gate row
 * checkboxes (e.g. permission checks) and surface a tooltip describing the
 * disablement reason.
 *
 * @returns Object containing the `selection` prop for `EuiBasicTable`.
 */
export const useSelection = (): UseSelectionReturn => {
  const { supports, features } = useContentListConfig();
  const { selectedItems, setSelection } = useContentListSelection();

  // Pull the user-supplied selectable predicate (if any) from the feature
  // config. `boolean` values default to "all rows selectable".
  const selectionConfig = isSelectionConfig(features.selection) ? features.selection : undefined;
  const selectablePredicate = selectionConfig?.selectable;
  const selectableMessage = selectionConfig?.selectableMessage;

  const selection: EuiTableSelectionType<ContentListItem> | undefined = useMemo(() => {
    if (!supports.selection) {
      return undefined;
    }

    // Adapt the consumer's `selectableMessage` (which may return `undefined`
    // for selectable rows) to EUI's stricter `(...) => string` signature. EUI
    // only consults the message when `selectable` is `false`, so any
    // `undefined` returned for a selectable row is coerced to an empty
    // string and never rendered.
    const adaptedSelectableMessage: EuiTableSelectionType<ContentListItem>['selectableMessage'] =
      selectableMessage
        ? (selectable, item) => selectableMessage(selectable, item) ?? ''
        : undefined;

    return {
      onSelectionChange: setSelection,
      selected: selectedItems,
      selectable: selectablePredicate ?? (() => true),
      ...(adaptedSelectableMessage && { selectableMessage: adaptedSelectableMessage }),
    };
  }, [supports.selection, setSelection, selectedItems, selectablePredicate, selectableMessage]);

  return { selection };
};
