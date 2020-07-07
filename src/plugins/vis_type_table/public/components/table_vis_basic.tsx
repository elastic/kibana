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

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiDataGrid } from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisParams } from '../types';
import { useFormattedColumns } from '../utils';
import { TableVisNoResults } from './table_vis_no_results';

interface TableVisBasicProps {
  table: Table;
  vis: ExprVis;
  visParams: TableVisParams;
}

const usePagination = (visParams: TableVisParams) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: visParams.perPage || 0,
    pageSizeOptions: [visParams.perPage || 0, 50],
  });
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => setPagination((pag) => ({ ...pag, pageSize, pageIndex: 0 })),
    []
  );
  const onChangePage = useCallback(
    (pageIndex: number) => setPagination((pag) => ({ ...pag, pageIndex })),
    []
  );

  useEffect(() => {
    setPagination({
      pageIndex: 0,
      pageSize: visParams.perPage || 0,
      pageSizeOptions: [visParams.perPage || 0, 50],
    });
  }, [visParams.perPage]);

  return pagination.pageSize
    ? {
        ...pagination,
        onChangeItemsPerPage,
        onChangePage,
      }
    : undefined;
};

export const TableVisBasic = memo(({ table, vis, visParams }: TableVisBasicProps) => {
  const formattedColumns = useFormattedColumns(table, visParams);
  const renderCellValue = useMemo(() => createTableVisCell(table, formattedColumns, vis), [
    table,
    formattedColumns,
    vis,
  ]);

  const pagination = usePagination(visParams);

  return table.rows.length > 0 ? (
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
      pagination={pagination}
    />
  ) : (
    <TableVisNoResults />
  );
});
