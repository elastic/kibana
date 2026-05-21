/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../../item';

/**
 * Optional configuration for row-level selection behavior.
 *
 * Provide a {@link SelectionConfig} as `features.selection` when you need to
 * gate which rows can be ticked (e.g. permission checks, item-state guards).
 * Pass a plain `boolean` when global enable/disable is enough.
 */
export interface SelectionConfig {
  /**
   * Per-row predicate forwarded to `EuiBasicTable`'s `selection.selectable`.
   *
   * Return `false` to disable the checkbox for a row. When omitted, every
   * row is selectable. The predicate must be referentially stable to avoid
   * resetting the table's controlled selection on every render — wrap it in
   * `useCallback` if it depends on dynamic data.
   */
  selectable?: (item: ContentListItem) => boolean;
  /**
   * Optional tooltip describing why a row's checkbox is disabled.
   *
   * Forwarded to `EuiBasicTable`'s `selection.selectableMessage`. The
   * signature mirrors EUI's: return a string to show as the tooltip, or
   * `undefined` when the row is selectable. Implementations can decide
   * based on both the resolved `selectable` verdict and the row data.
   */
  selectableMessage?: (selectable: boolean, item: ContentListItem) => string | undefined;
}

/**
 * Type guard for {@link SelectionConfig}.
 *
 * Returns `true` only for plain, non-array objects whose `selectable` and
 * `selectableMessage` properties (when present) are functions. `boolean`
 * values follow the legacy on/off behavior.
 */
export const isSelectionConfig = (
  selection: boolean | SelectionConfig | undefined
): selection is SelectionConfig => {
  if (typeof selection !== 'object' || selection === null || Array.isArray(selection)) {
    return false;
  }

  const { selectable, selectableMessage } = selection as Record<string, unknown>;

  return (
    (selectable === undefined || typeof selectable === 'function') &&
    (selectableMessage === undefined || typeof selectableMessage === 'function')
  );
};
