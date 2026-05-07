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
import { getRowControlColumn } from './row_control_column';
import { getRowMenuControlColumn } from './row_menu_control_column';

export const DEFAULT_VISIBLE_ROW_ACTIONS = 1;

export const getAdditionalRowControlColumns = (
  rowControlColumns: RowControlColumn[],
  visibleRowActions: number = DEFAULT_VISIBLE_ROW_ACTIONS
): {
  totalWidth: number;
  columns: RenderCellValue[];
} => {
  const visible = Math.max(1, visibleRowActions);
  const n = rowControlColumns.length;

  // Render all inline when there's at most one extra control beyond the visible
  // budget — collapsing would only save a single slot, which the menu trigger
  // itself would consume.
  if (n <= visible + 1) {
    const totalWidth = rowControlColumns.reduce(
      (acc, column) => acc + (column.width ?? DEFAULT_CONTROL_COLUMN_WIDTH),
      0
    );
    return { columns: rowControlColumns.map(getRowControlColumn), totalWidth };
  }

  const inlineControls = rowControlColumns.slice(0, visible);
  const menuControls = rowControlColumns.slice(visible);
  const inlineWidth = inlineControls.reduce(
    (acc, column) => acc + (column.width ?? DEFAULT_CONTROL_COLUMN_WIDTH),
    0
  );

  return {
    columns: [...inlineControls.map(getRowControlColumn), getRowMenuControlColumn(menuControls)],
    totalWidth: inlineWidth + DEFAULT_CONTROL_COLUMN_WIDTH,
  };
};
