/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useEffect, useTransition } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiProgress,
  EuiTreeView,
  EuiIcon,
  EuiSelect,
} from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { useDataCascadeState } from '../../lib';
import { Toolbar } from './toolbar';

interface DataCascadeProps<T extends Record<string, unknown>> {
  data: T[];
  onGroupByChange?: (groupBy: string) => void;
}

const DataRow = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText>Data Row</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>Details</EuiText>
        <EuiSelect
          id={basicSelectId}
          options={options}
          value={value}
          onChange={(e) => onChange(e)}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function DataCascade<T extends Record<string, unknown>>({
  data,
  onGroupByChange,
}: DataCascadeProps<T>) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const [isPending, startTransition] = useTransition();
  const columnHelper = createColumnHelper<T>();

  const table = useReactTable({
    data: data as T[],
    columns: [
      columnHelper.display({
        id: 'groupBy',
        cell: (info) => {
          console.log('info from groupBy:: %o \n', info);

          const groupByColumn = info.column.columnDef.header as string;

          return (
            <EuiSelect
              options={data.map((item) => ({
                value: item[groupByColumn] as string,
                text: item[groupByColumn] as string,
              }))}
              value={info.row.original[groupByColumn] as string}
              onChange={(e) => {
                startTransition(() => {
                  onGroupByChange?.(e.target.value);
                });
              }}
              aria-label={`Group by ${groupByColumn}`}
            />
          );
        },
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    // getSubRows: (row) => {},
    getExpandedRowModel: getExpandedRowModel(),
    autoResetExpanded: false,
    // onSortingChange: (sorting) => {
    //   state.setSorting(sorting);
    // },
    // onColumnVisibilityChange: (columnVisibility) => {
    //   state.setColumnVisibility(columnVisibility);
    // },
    // onGlobalFilterChange: (globalFilter) => {
    //   state.setGlobalFilter(globalFilter);
    // },
    // rangeExtractor
  });

  const { rows, flatRows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
    onChange: (instance) => {
      // virtualizer scroll instance
    },
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <Toolbar onSelectionChange={onGroupByChange} />
      </EuiFlexItem>
      <EuiFlexItem>
        <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
          <Fragment>{isPending && <EuiProgress />}</Fragment>
          <Fragment>
            {rowVirtualizer.getVirtualItems().map(function buildCascadeRows(virtualItem) {
              const row = flatRows[virtualItem.index];
              return (
                <EuiTreeView
                  key={row.id}
                  items={row.getVisibleCells().map((cell) => ({
                    label: cell.column.columnDef.cell,
                    id: cell.id,
                    icon: <EuiIcon type="arrowRight" />,
                    iconWhenExpanded: <EuiIcon type="arrowDown" />,
                    isExpanded: row.getIsExpanded(),
                    children: [],
                  }))}
                  aria-label="Data Cascade Tree View"
                />
              );
            })}
          </Fragment>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
