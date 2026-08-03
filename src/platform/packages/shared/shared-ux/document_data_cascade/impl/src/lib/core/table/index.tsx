/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useMemo, useEffect } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  useReactTable,
  type Table,
  type TableOptions,
  type CellContext,
  type Row,
  type Cell,
} from '@tanstack/react-table';
import type { LeafNode } from '../../../store_provider';
import {
  useDataCascadeActions,
  useDataCascadeState,
  type GroupNode,
} from '../../../store_provider';

export type { Row, Table, CellContext };

export interface TableProps<G, L>
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
    | 'onRowSelectionChange'
    | 'getRowCanExpand'
  > {
  initialData: G[];
  allowMultipleRowToggle: boolean;
  header: FC<{ table: Table<G> }>;
  rowCell: FC<CellContext<G, L>>;
}

export const useCascadeTable = <G extends GroupNode, L extends LeafNode>({
  allowMultipleRowToggle,
  enableRowSelection,
  header: Header,
  rowCell: RowCell,
  initialData,
  ...rest
}: TableProps<G, L>) => {
  const columnHelper = createColumnHelper<G>();
  const actions = useDataCascadeActions<G, L>();
  const state = useDataCascadeState<G, L>();

  useEffect(() => {
    actions.setInitialState(initialData);
  }, [initialData, actions]);

  const table = useReactTable<G>({
    ...rest,
    data: state.groupNodes,
    state: state.table,
    columns: [
      columnHelper.display({
        id: 'cascade',
        header: Header,
        // type cast is needed here to satisfy the generic CellContext type for column display
        cell: RowCell as FC<CellContext<G, unknown>>,
      }),
    ],
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    onRowSelectionChange: (updater) => {
      const proposedSelectedState =
        typeof updater === 'function' ? updater(state.table.rowSelection) : updater;

      actions.setSelectedRows(proposedSelectedState);
    },
    onExpandedChange: (updater) => {
      const proposedExpandedState =
        typeof updater === 'function' ? updater(state.table.expanded) : updater;

      const previousExpandedRows = Object.keys(state.table.expanded ?? {});
      const proposedExpandedRows = Object.keys(proposedExpandedState ?? {});

      // escape early if it's just one row that is expanded, or no rows are expanded
      if (proposedExpandedRows.length <= 1) {
        return actions.setExpandedRows(proposedExpandedState);
      }

      // track if we encountered a root row in the proposed expanded rows, not existing in previous expanded rows
      let newRootRow: string | null = null;

      const newExpandedRows: Record<string, boolean> = {};

      // Compute the new expanded rows, comparing the proposed expanded rows with the previous expanded rows
      for (const proposedRowId of proposedExpandedRows) {
        const row = table.getRow(proposedRowId);

        // special treatment for root rows
        if (!row?.parentId) {
          if (!previousExpandedRows.includes(proposedRowId) && !allowMultipleRowToggle) {
            // on encountering a root row that is newly expanded, we assign it to the new root pointer
            // and exit, as we want to only keep this row expanded
            newRootRow = proposedRowId;
            break;
          } else {
            newExpandedRows[proposedRowId] = true;
          }
        } else if (row?.parentId && proposedExpandedRows.includes(row?.parentId)) {
          // when row is a child, and its parent id is in previous expanded row,
          // we need to check if it has a sibling then apply a fitting treatment
          const siblings = table.getRow(row?.parentId)?.getLeafRows() ?? [];
          const expandedRowSiblings = siblings.filter(
            (sibling) => proposedExpandedRows.includes(sibling.id) && sibling.id !== proposedRowId
          );

          // we want to keep the row when it either has no sibling in the newly expanded rows,
          // or has a sibling but it isn't present in the previously expanded rows
          if (
            !expandedRowSiblings.length ||
            (expandedRowSiblings.length && !previousExpandedRows.includes(proposedRowId))
          ) {
            newExpandedRows[proposedRowId] = true;
            newExpandedRows[row.parentId] = true; // we keep it's parent as well
          }
        }
      }

      return actions.setExpandedRows(newRootRow ? { [newRootRow]: true } : newExpandedRows);
    },
    getRowId: (rowData) => rowData.id,
    getSubRows: (row) => row.children as G[],
  });

  return useMemo(
    () => ({
      get headerColumns() {
        return table.getHeaderGroups()[0].headers;
      },
      get rows() {
        return table.getRowModel().rows;
      },
    }),
    [table]
  );
};

interface TableRowAdapterArgs<G extends GroupNode> {
  rowInstance: Row<G>;
}

function getAdaptedTable<G extends GroupNode>({ tableInstance }: { tableInstance: Table<G> }) {
  return {
    selectedRows: tableInstance.getSelectedRowModel,
  };
}

export function useAdaptedTable<G extends GroupNode>(tableInstance: Table<G>) {
  return useMemo(() => getAdaptedTable<G>({ tableInstance }), [tableInstance]);
}

export function getAdaptedTableRows<G extends GroupNode, L extends LeafNode>({
  rowInstance,
}: TableRowAdapterArgs<G>) {
  const toggleSelectedHandler = rowInstance.getToggleSelectedHandler();
  const toggleExpandedHandler = rowInstance.getToggleExpandedHandler();

  return {
    rowId: rowInstance.id,
    rowParentId: rowInstance.parentId,
    get rowData() {
      return rowInstance.original;
    },
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
      return rowInstance.getVisibleCells() as Cell<G, L>[];
    },
    isRowSelected: rowInstance.getIsSelected,
    rowHasSelectedChildren: rowInstance.getIsSomeSelected,
    get rowCanSelect() {
      // maybe we also want to check if the row has children?
      return rowInstance.getCanSelect;
    },
    rowSelectionFn: (...args: Parameters<typeof toggleSelectedHandler>) => {
      toggleSelectedHandler(...args);
    },
    rowToggleFn: () => {
      toggleExpandedHandler();
    },
  };
}

export function useAdaptedTableRows<G extends GroupNode, L extends LeafNode>({
  rowInstance,
}: TableRowAdapterArgs<G>) {
  return useMemo(() => getAdaptedTableRows<G, L>({ rowInstance }), [rowInstance]);
}

/**
 * Container component that will render the configured table headers
 */
export function TableHeader<G extends GroupNode, L extends LeafNode>({
  headerColumns,
}: Pick<ReturnType<typeof useCascadeTable<G, L>>, 'headerColumns'>) {
  return headerColumns.map((header) => {
    return (
      <React.Fragment key={header.id}>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </React.Fragment>
    );
  });
}

export function TableCellRender<G extends GroupNode, L extends LeafNode>({
  cell,
}: {
  cell: Cell<G, L>;
}) {
  return useMemo(() => flexRender(cell.column.columnDef.cell, cell.getContext()), [cell]);
}
