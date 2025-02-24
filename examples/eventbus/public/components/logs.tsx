/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';

import { EuiDataGrid, EuiPanel, EuiSpacer } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

import { EsqlPopover } from './esql_popover';

export const Logs: FC = () => {
  const state = useEventBusExampleState();
  const esql = state.useEventBusState((s) => s.esql);
  const crossfilter = state.useEventBusState((s) => s.filters);
  const selectedFields = state.useEventBusState((s) => s.selectedFields);

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || selectedFields.length === 0) return null;

    const els = esql.split('|').map((d) => d.trim());
    Object.values(crossfilter).forEach((filter) => {
      els.splice(1, 0, `WHERE ${filter}`);
    });

    els.push(`KEEP ${selectedFields.join(',')}`);
    els.push('LIMIT 100');

    return els.join('\n| ');
  }, [crossfilter, esql, selectedFields]);

  const data = useFetchESQL(esqlWithFilters);

  const { columns, rows } = useMemo(() => {
    if (data) {
      const innerColumns = data.columns.map((c) => ({ id: c.name, displayAsText: c.name }));

      const innerRows = data.values.map((row) => {
        return row.reduce((acc, val, idx) => {
          acc[data.columns[idx].name] = val;
          return acc;
        }, {});
      });

      return { columns: innerColumns, rows: innerRows };
    }

    return { columns: [], rows: [] };
  }, [data]);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  useEffect(() => {
    setVisibleColumns(['message']);
  }, [columns]);

  const setPageIndex = useCallback(
    (pageIndex: number) => setPagination((pagination) => ({ ...pagination, pageIndex })),
    []
  );
  const setPageSize = useCallback(
    (pageSize: number) =>
      setPagination((pagination) => ({ ...pagination, pageSize, pageIndex: 0 })),
    []
  );

  return (
    <EuiPanel paddingSize="s" hasBorder css={{ width: '100%', position: 'relative' }}>
      {esqlWithFilters !== null && <EsqlPopover esql={esqlWithFilters} />}
      <EuiSpacer size="s" />
      <EuiDataGrid
        aria-label="Container constrained data grid demo"
        columns={columns}
        columnVisibility={{
          visibleColumns,
          setVisibleColumns,
        }}
        rowCount={rows.length}
        gridStyle={{
          border: 'horizontal',
          header: 'underline',
          fontSize: 's',
        }}
        renderCellValue={({ rowIndex, columnId }) => rows[rowIndex][columnId]}
        pagination={{
          ...pagination,
          onChangeItemsPerPage: setPageSize,
          onChangePage: setPageIndex,
        }}
      />
    </EuiPanel>
  );
};
