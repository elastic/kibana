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
 * using controlled mode (`selected`).
 *
 * Composes two layers of "is this row selectable?":
 * 1. The configured delete action restriction, when delete is bulk-enabled.
 * 2. The consumer's optional `SelectionConfig.selectable` predicate.
 *
 * The tooltip (`selectableMessage`) surfaces the consumer's message if they
 * disabled the row, or the delete restriction reason otherwise.
 *
 * @returns Object containing the `selection` prop for `EuiBasicTable`.
 */
export const useSelection = (): UseSelectionReturn => {
  const { supports, features, item: itemConfig } = useContentListConfig();
  const { selectedItems, setSelection } = useContentListSelection();

  // Pull the user-supplied selectable predicate (if any) from the feature
  // config. `boolean` values default to "all rows selectable".
  const selectionConfig = isSelectionConfig(features.selection) ? features.selection : undefined;
  const consumerSelectable = selectionConfig?.selectable;
  const consumerSelectableMessage = selectionConfig?.selectableMessage;
  const deleteConfig = itemConfig?.actions?.delete;
  const deleteRestriction =
    typeof deleteConfig?.onBulkAction === 'function' ? deleteConfig.restriction : undefined;

  const selection: EuiTableSelectionType<ContentListItem> | undefined = useMemo(() => {
    if (!supports.selection) {
      return undefined;
    }

    /**
     * Composed selectable verdict. Returns `false` as soon as either
     * layer objects, so the most-specific reason can be surfaced by the
     * message adapter below.
     */
    const composedSelectable = (item: ContentListItem): boolean => {
      const consumerOK = consumerSelectable ? consumerSelectable(item) : true;
      if (!consumerOK) {
        return false;
      }
      return deleteRestriction ? deleteRestriction(item) === undefined : true;
    };

    /**
     * Composed message. Order matters: when the consumer's predicate marks
     * a row not-selectable, their message wins (their reason is the more
     * specific one); otherwise the delete restriction reason is surfaced.
     * EUI only displays the message for non-selectable rows,
     * so the `selectable === true` branch always returns `''`.
     */
    const composedSelectableMessage = (isSelectable: boolean, item: ContentListItem): string => {
      if (isSelectable) {
        return '';
      }
      // Prefer the consumer's reason when their predicate disabled the
      // row; fall back to the restriction reason; finally let EUI emit
      // an empty string (the consumer didn't supply a per-item message).
      const consumerOK = consumerSelectable ? consumerSelectable(item) : true;
      if (!consumerOK) {
        const consumerMsg = consumerSelectableMessage?.(false, item);
        if (consumerMsg) {
          return consumerMsg;
        }
      }
      return deleteRestriction?.(item) ?? consumerSelectableMessage?.(false, item) ?? '';
    };

    // Only forward `selectableMessage` when there's a real reason source;
    // otherwise let EUI fall back to its default behaviour and keep the
    // pre-existing "no message provided" test contract intact.
    const hasMessageSource =
      Boolean(consumerSelectableMessage) || typeof deleteRestriction === 'function';

    return {
      onSelectionChange: setSelection,
      selected: selectedItems,
      selectable: composedSelectable,
      ...(hasMessageSource && { selectableMessage: composedSelectableMessage }),
    };
  }, [
    supports.selection,
    setSelection,
    selectedItems,
    consumerSelectable,
    consumerSelectableMessage,
    deleteRestriction,
  ]);

  return { selection };
};
