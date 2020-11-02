/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  const content = column?.formatter?.convert(rowValue, 'html') || (rowValue as string) || '';

  const cellContent = (
    <div
      /*
       * Justification for dangerouslySetInnerHTML:
       * The Data table visualization can "enrich" cell contents by applying a field formatter,
       * which we want to do if possible.
       */
      dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
      data-test-subj="tbvChartCellContent"
    />
  );

  return cellContent;
};
