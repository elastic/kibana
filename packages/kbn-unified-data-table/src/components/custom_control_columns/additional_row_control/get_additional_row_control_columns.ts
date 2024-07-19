/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { RowControlColumn } from '../../../types';
import { getAdditionalRowControlColumn } from './additional_row_control_column';
import { getAdditionalActionsRowControlColumn } from './additional_actions_row_control_column';

export const getAdditionalRowControlColumns = (
  rowControlColumns: RowControlColumn[]
): EuiDataGridControlColumn[] => {
  if (rowControlColumns.length <= 2) {
    return rowControlColumns.map(getAdditionalRowControlColumn);
  }

  return [
    getAdditionalRowControlColumn(rowControlColumns[0]),
    getAdditionalActionsRowControlColumn(rowControlColumns.slice(1)),
  ];
};
