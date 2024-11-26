/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';

import { EuiDataGrid, EuiPanel } from '@elastic/eui';

import { getESQLResults } from '@kbn/esql-utils';
import type { ESQLSearchResponse } from '@kbn/es-types';

import { useDeps } from '../hooks/use_deps';
import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';

export const Logs: FC = () => {
  const { plugins } = useDeps();
  const { data: dataPlugin } = plugins;
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);
  const selectedFields = state.useState((s) => s.selectedFields);

  const [data, setData] = useState<ESQLSearchResponse>();
  const esqlWithFilters = useMemo(() => {
    const queryFields = [...selectedFields, 'message'];
    return `${esql} | LIMIT 100 | KEEP ${queryFields.join(',')}`;
  }, [esql, selectedFields]);

  // fetch data from ES
  useEffect(() => {
    const fetchData = async () => {
      const resultCrossfilter = await getESQLResults({
        esqlQuery: esqlWithFilters,
        // filter,
        search: dataPlugin.search.search,
        // signal: abortController?.signal,
        // timeRange: { from: fromDate, to: toDate },
      });

      setData(resultCrossfilter.response);
    };

    if (esql !== '') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esql, esqlWithFilters]);

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

  const [pagination, setPagination] = useState({ pageIndex: 0 });

  const [visibleColumns, setVisibleColumns] = useState(columns.map(({ id }) => id));

  useEffect(() => {
    setVisibleColumns(columns.map(({ id }) => id));
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
    <EuiPanel paddingSize="s" hasBorder css={{ width: '100%' }}>
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
