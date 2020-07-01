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

import React, { useEffect } from 'react';
import { EuiDataGrid } from '@elastic/eui';

import { ReactVisComponentProps } from 'src/plugins/visualizations/public';
import { createTableVisCell } from './table_vis_cell';
import { TableVisParams } from '../types';
import { TableContext } from '../table_vis_response_handler';

export const TableVisualization = ({
  renderComplete,
  visData: { direction, table, tables },
  visParams,
}: ReactVisComponentProps<TableContext, TableVisParams>) => {
  useEffect(() => {
    renderComplete();
  }, [renderComplete]);

  return table ? (
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
      renderCellValue={createTableVisCell(table, visParams)}
      pagination={{
        pageIndex: 0,
        pageSize: 10,
        pageSizeOptions: [50, 100, 200],
        onChangePage: () => {},
        onChangeItemsPerPage: () => {},
      }}
    />
  ) : null;
  // (
  //   visData.tables.map((table, key) => (
  //     <EuiDataGrid
  //       key={key}
  //       aria-label=""
  //       columns={table.columns.map((col) => ({
  //         id: col.id,
  //         display: col.name,
  //       }))}
  //       rowCount={table.rows.length}
  //       columnVisibility={{
  //         visibleColumns: table.columns.map((col) => col.id),
  //         setVisibleColumns: () => {},
  //       }}
  //       renderCellValue={createTableVisCell()}
  //       pagination={{
  //         pageIndex: 0,
  //         pageSize: 10,
  //         pageSizeOptions: [50, 100, 200],
  //         onChangePage: () => {},
  //         onChangeItemsPerPage: () => {},
  //       }}
  //     />
  //   ))
  // );
};
