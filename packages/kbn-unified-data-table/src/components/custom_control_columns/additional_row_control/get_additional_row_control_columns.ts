/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { RowControlColumn } from '../../../types';
import { getRowControlColumn } from './row_control_column';
import { getRowMenuControlColumn } from './row_menu_control_column';

export const getAdditionalRowControlColumns = (
  rowControlColumns: RowControlColumn[]
): EuiDataGridControlColumn[] => {
  if (rowControlColumns.length <= 2) {
    return rowControlColumns.map(getRowControlColumn);
  }

  return [
    getRowControlColumn(rowControlColumns[0]),
    getRowMenuControlColumn(rowControlColumns.slice(1)),
  ];
};
