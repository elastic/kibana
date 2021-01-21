/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';

import { Table } from '../table_vis_response_handler';
import { FormattedColumn } from '../types';

export const createTableVisCell = (formattedColumns: FormattedColumn[], rows: Table['rows']) => ({
  // @ts-expect-error
  colIndex,
  rowIndex,
  columnId,
}: EuiDataGridCellValueElementProps) => {
  const rowValue = rows[rowIndex][columnId];
  const column = formattedColumns[colIndex];
  const content = column.formatter.convert(rowValue, 'html');

  const cellContent = (
    <div
      /*
       * Justification for dangerouslySetInnerHTML:
       * The Data table visualization can "enrich" cell contents by applying a field formatter,
       * which we want to do if possible.
       */
      dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
      data-test-subj="tbvChartCellContent"
      className="tbvChartCellContent"
    />
  );

  return cellContent;
};
