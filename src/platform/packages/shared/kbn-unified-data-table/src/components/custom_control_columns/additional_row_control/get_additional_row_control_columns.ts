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

export const getAdditionalRowControlColumns = (
  rowControlColumns: RowControlColumn[]
): {
  totalWidth: number;
  columns: RenderCellValue[];
} => {
  if (rowControlColumns.length <= 2) {
    const totalWidth = rowControlColumns.reduce(
      (acc, column) => acc + (column.width ?? DEFAULT_CONTROL_COLUMN_WIDTH),
      0
    );
    return { columns: rowControlColumns.map(getRowControlColumn), totalWidth };
  }

  return {
    columns: [
      getRowControlColumn(rowControlColumns[0]),
      getRowMenuControlColumn(rowControlColumns.slice(1)),
    ],
    totalWidth:
      (rowControlColumns[0].width ?? DEFAULT_CONTROL_COLUMN_WIDTH) + DEFAULT_CONTROL_COLUMN_WIDTH,
  };
};
