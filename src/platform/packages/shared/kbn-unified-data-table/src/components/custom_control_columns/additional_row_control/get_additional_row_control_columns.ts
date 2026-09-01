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
import { createAvailableControlsGetter, getCompatibleSlotRenderers } from './row_control_column';
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

  // Shared cache: isAvailable is evaluated at most once per record across inline and menu.
  const getAvailableControls = createAvailableControlsGetter(rowControlColumns);

  // Each inline slot picks the Kth available action per-row (after isAvailable filtering),
  // so the visible count reflects truly compatible actions rather than positional gaps.
  const allInline = n <= totalVisible;
  const numInlineSlots = allInline ? n : totalVisible - 1;

  const inlineColumns = getCompatibleSlotRenderers(numInlineSlots, getAvailableControls);

  // Width is computed from the static action list as a best-effort estimate;
  // per-row filtering may leave some slots empty but the column width stays fixed.
  const inlineWidth = rowControlColumns
    .slice(0, numInlineSlots)
    .reduce((acc, col) => acc + (col.width ?? DEFAULT_CONTROL_COLUMN_WIDTH), 0);

  if (allInline) {
    return { columns: inlineColumns, totalWidth: inlineWidth };
  }

  // Pass the shared getter + startIndex so the menu only shows actions that didn't
  // fit in the inline slots and are available for the current row.
  return {
    columns: [...inlineColumns, getRowMenuControlColumn(getAvailableControls, numInlineSlots)],
    totalWidth: inlineWidth + DEFAULT_CONTROL_COLUMN_WIDTH,
  };
};
