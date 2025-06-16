/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef, useState } from 'react';
import { EuiDataGrid, EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { generateMockData } from './data';
import { getRenderCellValueMock } from './render_cell_value_mock';
import { useDataGridInTableSearch } from '../use_data_grid_in_table_search';

export interface DataGridWithInTableSearchExampleProps {
  rowsCount: number;
  columnsCount: number;
  pageSize: number | null;
}

export const DataGridWithInTableSearchExample: React.FC<DataGridWithInTableSearchExampleProps> = ({
  rowsCount,
  columnsCount,
  pageSize,
}) => {
  const dataGridRef = useRef<EuiDataGridRefProps>(null);
  const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);

  const sampleData = useMemo(
    () => generateMockData(rowsCount, columnsCount),
    [rowsCount, columnsCount]
  );
  const columns = useMemo(
    () => Array.from({ length: columnsCount }, (_, i) => ({ id: `column-${i}` })),
    [columnsCount]
  );

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  const renderCellValue = useMemo(() => getRenderCellValueMock(sampleData), [sampleData]);

  const isPaginationEnabled = typeof pageSize === 'number';
  const [pageIndex, setPageIndex] = useState(0);
  const pagination = useMemo(() => {
    return isPaginationEnabled
      ? {
          onChangePage: setPageIndex,
          onChangeItemsPerPage: () => {},
          pageIndex,
          pageSize,
        }
      : undefined;
  }, [isPaginationEnabled, setPageIndex, pageSize, pageIndex]);

  const {
    inTableSearchTermCss,
    inTableSearchControl,
    cellContextWithInTableSearchSupport,
    renderCellValueWithInTableSearchSupport,
  } = useDataGridInTableSearch({
    dataGridWrapper,
    dataGridRef,
    visibleColumns,
    rows: sampleData,
    cellContext: undefined,
    renderCellValue,
    pagination,
  });

  const toolbarVisibility: EuiDataGridProps['toolbarVisibility'] = useMemo(
    () => ({
      additionalControls: inTableSearchControl ? { right: inTableSearchControl } : false,
    }),
    [inTableSearchControl]
  );

  return (
    <div ref={(node) => setDataGridWrapper(node)} css={inTableSearchTermCss}>
      <EuiDataGrid
        ref={dataGridRef}
        aria-label="Data grid with in-table search"
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        toolbarVisibility={toolbarVisibility}
        rowCount={rowsCount}
        pagination={pagination}
        cellContext={cellContextWithInTableSearchSupport}
        renderCellValue={renderCellValueWithInTableSearchSupport}
        width={800}
        height={200}
      />
    </div>
  );
};
