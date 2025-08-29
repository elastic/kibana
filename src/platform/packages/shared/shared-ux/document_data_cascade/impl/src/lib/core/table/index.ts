/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type FC, useRef, useMemo } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type Table,
  type TableOptions,
  type CellContext,
  type Row,
} from '@tanstack/react-table';
export { flexRender } from '@tanstack/react-table';
import type { LeafNode } from '../../../store_provider';
import {
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
  allowMultipleRowToggle: boolean;
  header: FC<{ table: Table<G> }>;
  rowCell: FC<CellContext<G, unknown>>;
}

export const useTableHelper = <G extends GroupNode, L extends LeafNode>({
  allowMultipleRowToggle,
  enableRowSelection,
  header: Header,
  rowCell: RowCell,
  ...rest
}: TableProps<G>) => {
  const tableRef = useRef<Table<G>>();
  const columnHelper = createColumnHelper<G>();
  const actions = useDataCascadeActions<G, L>();
  const state = useDataCascadeState<G, L>();

  tableRef.current = useReactTable<G>({
    ...rest,
    data: state.groupNodes,
    state: state.table,
    columns: [
      columnHelper.display({
        id: 'cascade',
        header: Header,
        cell: RowCell,
      }),
    ],
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    onExpandedChange: (updater) => {
      const proposedExpandedState =
        typeof updater === 'function' ? updater(state.table.expanded) : updater;

      if (allowMultipleRowToggle) {
        return actions.setExpandedRows(proposedExpandedState);
      }

      const previousExpandedRows = Object.keys(state.table.expanded ?? {});
      const proposedExpandedRows = Object.keys(proposedExpandedState ?? {});

      // escape early if it's just one row that is expanded, or no rows are expanded
      if (proposedExpandedRows.length <= 1) {
        return actions.setExpandedRows(proposedExpandedState);
      }

      // Compute the new expanded rows, comparing the proposed expanded rows with the previous expanded rows
      const newExpandedRows = proposedExpandedRows.reduce((acc, id) => {
        const row = tableRef.current!.getRow?.(id);

        if (
          // when the row is root, and its id is not in previousExpandedRows we want to keep it
          !row?.parentId &&
          !previousExpandedRows.includes(row?.id ?? '')
        ) {
          acc[id] = true;
        } else if (row?.parentId && previousExpandedRows.includes(row?.parentId)) {
          // when row is a child, and its parent id is in previous expanded row,
          // we need to check if it has a sibling then apply a fitting treatment
          const siblings = tableRef.current!.getRow?.(row?.parentId)?.getLeafRows() ?? [];
          const expandedRowSibling = siblings.find(
            (sibling) => proposedExpandedRows.includes(sibling.id) && sibling.id !== id
          );

          // we want to keep the row when it either has no sibling in the newly expanded rows,
          // or has a sibling but it isn't present in the previously expanded rows
          if (!expandedRowSibling || (expandedRowSibling && !previousExpandedRows.includes(id))) {
            acc[id] = true;
            acc[row.parentId] = true; // we keep the parent as well
          }
        }

        return acc;
      }, {} as Record<string, boolean>);

      return actions.setExpandedRows(newExpandedRows);
    },
    getRowId: (rowData) => rowData.id,
    getSubRows: (row) => row.children as G[],
  });

  return {
    get headerColumns() {
      return tableRef.current!.getHeaderGroups()[0].headers;
    },
    get rows() {
      return tableRef.current!.getRowModel().rows;
    },
  };
};

interface TableRowAdapterProps<G extends GroupNode> {
  rowInstance: Row<G>;
}

export function useTableRowAdapter<G extends GroupNode>({ rowInstance }: TableRowAdapterProps<G>) {
  return useMemo(() => {
    return {
      rowId: rowInstance.id,
      rowParentId: rowInstance.parentId,
      get rowIsExpanded() {
        return rowInstance.getIsExpanded();
      },
      get hasAllParentsExpanded() {
        return rowInstance.getIsAllParentsExpanded();
      },
      get rowDepth() {
        return rowInstance.depth;
      },
      get rowChildren() {
        return rowInstance.subRows;
      },
      get rowChildrenCount() {
        return this.rowChildren.length;
      },
      get rowVisibleCells() {
        return rowInstance.getVisibleCells();
      },
      get rowIsSelected() {
        return rowInstance.getIsSelected();
      },
      get rowHasSelectedChildren() {
        return rowInstance.getIsSomeSelected();
      },
      get rowCanSelect() {
        // maybe we also want to check if the row has children?
        return rowInstance.getCanSelect();
      },
      rowSelectionFn: rowInstance.getToggleSelectedHandler(),
      rowToggleFn: rowInstance.getToggleExpandedHandler(),
    };
  }, [rowInstance]);
}
