/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useEffect, useTransition } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiProgress, EuiTreeView, EuiTreeViewItem } from '@elastic/eui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useReactTable, createColumnHelper, getCoreRowModel  } from '@tanstack/react-table';
import { useDataCascadeState } from '../../lib';
import { Toolbar } from './toolbar';

interface DataCascadeProps {
  onGroupByChange?: (groupBy: string) => void;
}

export function DataCascade<T extends Record<string, unknown>>({
  onGroupByChange,
}: DataCascadeProps) {
  // The scrollable element for your list
  const parentRef = React.useRef(null);
  const [isPending, startTransition] = useTransition();
  const state = useDataCascadeState();
  const columnHelper = createColumnHelper<T>();

  const table = useReactTable({
    data: state.data as T[],
    columns: [
      columnHelper.display({
        id: 'groupBy',
        header: 'Group By',
        cell: (info) => info.getValue(),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    // getSubRows: (row) => {
      
    // },
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

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    getScrollElement: () => parentRef.current,
    overscan: 5,
    onChange: (instance) => {
      // virtualizer scroll instance
    },
  });

  useEffect(() => {
    startTransition(() => {
      onGroupByChange?.(state.currentGroupByColumn!);
    });
  }, [onGroupByChange, state.currentGroupByColumn]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <Toolbar />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText>
          <div>
            <h1>ESQL Data Pooler</h1>
            <p>Query: {state.currentQueryString}</p>
          </div>
        </EuiText>
        <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
          <Fragment>{isPending && <EuiProgress />}</Fragment>
          <EuiTreeView></EuiTreeView>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
