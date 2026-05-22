/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';

import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type { FormattedColumns } from '../types';

export const createTableVisCell =
  (rows: DatatableRow[], formattedColumns: FormattedColumns, autoFitRowToContent?: boolean) =>
  ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
    // incoming data might change and put the current page out of bounds - check whether row actually exists
    const rowValue = rows[rowIndex]?.[columnId];
    const column = formattedColumns[columnId];
    const content = column?.formatter.reactConvert(rowValue);

    const cellContent = (
      <div
        data-test-subj="tbvChartCellContent"
        className={autoFitRowToContent ? '' : 'tbvChartCellContent eui-textTruncate'}
      >
        {content}
      </div>
    );

    return cellContent;
  };
