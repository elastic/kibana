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

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisConfig } from '../types';
import { useFormattedColumnsAndRows, usePagination } from '../utils';
import { TableVisNoResults } from './table_vis_no_results';
import { TableVisControls } from './table_vis_controls';

interface TableVisBasicProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  table: Table;
  visConfig: TableVisConfig;
}

export const TableVisBasic = memo(({ table, fireEvent, visConfig }: TableVisBasicProps) => {
  const { columns, rows } = useFormattedColumnsAndRows(table, visConfig);
  const renderCellValue = useMemo(() => createTableVisCell(table, columns, rows, fireEvent), [
    table,
    columns,
    rows,
    fireEvent,
  ]);

  const pagination = usePagination(visConfig);

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
      toolbarVisibility={
        visConfig.showToolbar && {
          showColumnSelector: false,
          showFullScreenSelector: false,
          additionalControls: (
            <TableVisControls cols={columns} rows={rows} table={table} filename={visConfig.title} />
          ),
        }
      }
      renderCellValue={renderCellValue}
      pagination={pagination}
    />
  ) : (
    <TableVisNoResults />
  );
});
