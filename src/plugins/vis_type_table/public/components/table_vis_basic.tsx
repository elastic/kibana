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

import React, { memo, useMemo } from 'react';
import { EuiDataGrid } from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisParams } from '../types';
import { useFormattedColumnsAndRows, usePagination } from '../utils';
import { TableVisNoResults } from './table_vis_no_results';
import { TableVisControls } from './table_vis_controls';

interface TableVisBasicProps {
  table: Table;
  vis: ExprVis;
  visParams: TableVisParams;
}

export const TableVisBasic = memo(({ table, vis, visParams }: TableVisBasicProps) => {
  const { columns, rows } = useFormattedColumnsAndRows(table, visParams);
  const renderCellValue = useMemo(() => createTableVisCell(table, columns, rows, vis), [
    table,
    columns,
    rows,
    vis,
  ]);

  const pagination = usePagination(visParams);

  return rows.length > 0 ? (
    <EuiDataGrid
      aria-label=""
      columns={columns.map((col) => ({
        id: col.id,
        display: col.title,
      }))}
      gridStyle={{
        border: 'horizontal',
        header: 'underline',
      }}
      rowCount={rows.length}
      columnVisibility={{
        visibleColumns: columns.map((col) => col.id),
        setVisibleColumns: () => {},
      }}
      toolbarVisibility={{
        additionalControls: <TableVisControls cols={columns} rows={rows} table={table} />,
      }}
      renderCellValue={renderCellValue}
      pagination={pagination}
    />
  ) : (
    <TableVisNoResults />
  );
});
