/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type Table,
  type TableOptions,
  type ColumnDef,
} from '@tanstack/react-table';
import { useRef } from 'react';
import {
  LeafNode,
  useDataCascadeActions,
  useDataCascadeState,
  type GroupNode,
} from '../../../store_provider';

interface TableProps<G>
  extends Omit<
    TableOptions<G>,
    | 'columns'
    | 'data'
    | 'state'
    | 'getRowId'
    | 'getSubRows'
    | 'getCoreRowModel'
    | 'getExpandedRowModel'
    | 'onExpandedChange'
    | 'getRowCanExpand'
  > {
  columns: (columnsHelper: ReturnType<typeof createColumnHelper<G>>) => ColumnDef<G>[];
  allowExpandMultiple: boolean;
}

export const useTableHelper = <G extends GroupNode, L extends LeafNode>({
  columns,
  allowExpandMultiple,
  ...rest
}: TableProps<G>) => {
  const tableRef = useRef<Table<G>>();
  const columnHelper = createColumnHelper<G>();
  const actions = useDataCascadeActions<G, L>();
  const state = useDataCascadeState<G, L>();

  tableRef.current = useReactTable<G>({
    data: state.groupNodes,
    state: state.table,
    columns: columns(columnHelper),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    onExpandedChange: (updater) => {
      const newExpandedState =
        typeof updater === 'function' ? updater(state.table.expanded) : updater;

      if (allowExpandMultiple) {
        return actions.setExpandedRows(newExpandedState);
      }

      const previousExpandedRows = Object.keys(state.table.expanded ?? {});
      const newlyExpandedRows = Object.keys(newExpandedState ?? {});

      // escape early if it's just one row that is expanded, or no rows are expanded
      if (newlyExpandedRows.length <= 1) {
        return actions.setExpandedRows(newExpandedState);
      }

      // Compute the rows to keep, comparing the newly expanded rows with the previous expanded rows
      const rowsToKeep = newlyExpandedRows.reduce((acc, id) => {
        const row = tableRef.current!.getRow?.(id);

        if (
          // when the row is root, and its id is not in previousExpandedRows we want to keep it
          (!row?.parentId && !previousExpandedRows.includes(row?.id ?? '')) ||
          // when row is a child, and its parentId is not in previousExpandedRows we want to keep it
          (row?.parentId && !previousExpandedRows.includes(row?.parentId))
        ) {
          acc[id] = true;
        } else if (row?.parentId && previousExpandedRows.includes(row?.parentId)) {
          // when row is a child, and its parent id is in previous expanded row, we need to check if it has a sibling then apply a fitting treatment
          const siblings = tableRef.current!.getRow?.(row?.parentId)?.getLeafRows() ?? [];
          const expandedRowSibling = siblings.find(
            (sibling) => newlyExpandedRows.includes(sibling.id) && sibling.id !== id
          );

          if (!expandedRowSibling) {
            acc[id] = true;
            acc[row.parentId] = true; // keep the parent as well
          } else if (expandedRowSibling && !previousExpandedRows.includes(id)) {
            // keep the row if it has a sibling that is expanded but it was not in previousExpandedRows
            acc[id] = true;
            acc[row.parentId] = true; // keep the parent as well
          }
        }

        return acc;
      }, {} as Record<string, boolean>);

      return actions.setExpandedRows(rowsToKeep);
    },
    getRowId: (rowData) => rowData.id,
    getSubRows: (row) => row.children as G[],
    ...rest,
  });

  return {
    get table() {
      return tableRef.current!;
    },
  };
};
