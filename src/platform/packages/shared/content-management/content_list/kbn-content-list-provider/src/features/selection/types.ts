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
 * Return type for the {@link useContentListSelection} hook.
 */
export interface UseContentListSelectionReturn {
  /** IDs of currently selected items. */
  selectedIds: string[];
  /** Currently selected items resolved from the loaded items list. */
  selectedItems: ContentListItem[];
  /** Number of currently selected items. */
  selectedCount: number;
  /** Whether a specific item is selected. */
  isSelected: (id: string) => boolean;
  /**
   * Replace the selection with the given items.
   * Typically called by `EuiBasicTable`'s `onSelectionChange` callback.
   */
  setSelection: (items: ContentListItem[]) => void;
  /** Clear all selected items. */
  clearSelection: () => void;
  /** Whether selection is supported (enabled via features, not read-only). */
  isSupported: boolean;
}
