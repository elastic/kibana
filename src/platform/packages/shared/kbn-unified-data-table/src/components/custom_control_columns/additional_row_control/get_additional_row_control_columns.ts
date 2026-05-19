/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RowControlColumn } from '@kbn/discover-utils';
import type { RenderCellValue } from '@elastic/eui';
import { DEFAULT_CONTROL_COLUMN_WIDTH } from '../../../constants';
import { getCompatibleSlotRenderers } from './row_control_column';
import { getRowMenuControlColumn } from './row_menu_control_column';

export const DEFAULT_VISIBLE_ROW_LEADING_CONTROLS = 2;

export const getAdditionalRowControlColumns = (
  rowControlColumns: RowControlColumn[],
  visibleRowLeadingControls: number = DEFAULT_VISIBLE_ROW_LEADING_CONTROLS
): {
  totalWidth: number;
  columns: RenderCellValue[];
} => {
  // Minimum 2: at least one inline control plus the overflow menu slot.
  const totalVisible = Math.max(2, visibleRowLeadingControls);
  const n = rowControlColumns.length;

  if (n === 0) return { columns: [], totalWidth: 0 };

  // Each inline slot picks the Kth available action per-row (after isAvailable filtering),
  // so the visible count reflects truly compatible actions rather than positional gaps.
  const allInline = n <= totalVisible;
  const numInlineSlots = allInline ? n : totalVisible - 1;

  const inlineColumns = getCompatibleSlotRenderers(rowControlColumns, numInlineSlots);

  // Width is computed from the static action list as a best-effort estimate;
  // per-row filtering may leave some slots empty but the column width stays fixed.
  const inlineWidth = rowControlColumns
    .slice(0, numInlineSlots)
    .reduce((acc, col) => acc + (col.width ?? DEFAULT_CONTROL_COLUMN_WIDTH), 0);

  if (allInline) {
    return { columns: inlineColumns, totalWidth: inlineWidth };
  }

  // Pass the full list + startIndex so the menu filters by isAvailable per-row
  // and only shows actions that didn't fit in the inline slots.
  return {
    columns: [...inlineColumns, getRowMenuControlColumn(rowControlColumns, numInlineSlots)],
    totalWidth: inlineWidth + DEFAULT_CONTROL_COLUMN_WIDTH,
  };
};
