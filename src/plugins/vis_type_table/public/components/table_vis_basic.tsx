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

import React, { useMemo, memo } from 'react';
import { EuiDataGrid } from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisParams } from '../types';
import { useFormattedColumns } from '../utils';

interface TableVisBasicProps {
  table: Table;
  vis: ExprVis;
  visParams: TableVisParams;
}

export const TableVisBasic = memo(({ table, vis, visParams }: TableVisBasicProps) => {
  const formattedColumns = useFormattedColumns(table, visParams);
  const renderCellValue = useMemo(() => createTableVisCell(table, formattedColumns, vis), [
    table,
    formattedColumns,
    vis,
  ]);

  return (
    <EuiDataGrid
      aria-label=""
      columns={table.columns.map((col) => ({
        id: col.id,
        display: col.name,
      }))}
      rowCount={table.rows.length}
      columnVisibility={{
        visibleColumns: table.columns.map((col) => col.id),
        setVisibleColumns: () => {},
      }}
      renderCellValue={renderCellValue}
      pagination={{
        pageIndex: 0,
        pageSize: 10,
        pageSizeOptions: [50, 100, 200],
        onChangePage: () => {},
        onChangeItemsPerPage: () => {},
      }}
    />
  );
});
