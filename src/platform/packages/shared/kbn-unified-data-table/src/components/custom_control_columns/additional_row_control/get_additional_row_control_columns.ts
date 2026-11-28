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

export interface AdditionalRowControlsLayout {
  numInlineSlots: number;
  hasMenu: boolean;
  totalWidth: number;
}

export const getAdditionalRowControlsLayout = (
  rowControlColumns: RowControlColumn[],
  visibleRowLeadingControls: number = DEFAULT_VISIBLE_ROW_LEADING_CONTROLS
): AdditionalRowControlsLayout => {
  // Minimum 2: at least one inline control plus the overflow menu slot.
  const totalVisible = Math.max(2, visibleRowLeadingControls);
  const n = rowControlColumns.length;

  if (n === 0) return { numInlineSlots: 0, hasMenu: false, totalWidth: 0 };

  // Each inline slot picks the Kth available action per-row (after isAvailable filtering),
  // so the visible count reflects truly compatible actions rather than positional gaps.
  const allInline = n <= totalVisible;
  const numInlineSlots = allInline ? n : totalVisible - 1;

  // Width is computed from the static action list as a best-effort estimate;
  // per-row filtering may leave some slots empty but the column width stays fixed.
  const inlineWidth = rowControlColumns
    .slice(0, numInlineSlots)
    .reduce((acc, col) => acc + (col.width ?? DEFAULT_CONTROL_COLUMN_WIDTH), 0);

  if (allInline) {
    return { numInlineSlots, hasMenu: false, totalWidth: inlineWidth };
  }

  return {
    numInlineSlots,
    hasMenu: true,
    totalWidth: inlineWidth + DEFAULT_CONTROL_COLUMN_WIDTH,
  };
};

/**
 * Creates the inline slot and overflow menu cells for a layout. The cells read the current
 * controls from `RowControlsContext`, so they only need recreating when the layout changes.
 */
export const getAdditionalRowControlColumns = ({
  numInlineSlots,
  hasMenu,
}: AdditionalRowControlsLayout): RenderCellValue[] => {
  const inlineColumns = getCompatibleSlotRenderers(numInlineSlots);

  // The menu starts after the inline slots, so it only shows actions that didn't fit.
  return hasMenu ? [...inlineColumns, getRowMenuControlColumn(numInlineSlots)] : inlineColumns;
};
