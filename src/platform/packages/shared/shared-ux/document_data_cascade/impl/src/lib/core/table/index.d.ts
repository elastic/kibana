import React, { type FC } from 'react';
import { type Table, type TableOptions, type CellContext, type Row, type Cell } from '@tanstack/react-table';
import type { LeafNode } from '../../../store_provider';
import { type GroupNode } from '../../../store_provider';
export type { Row, Table, CellContext };
export interface TableProps<G, L> extends Omit<TableOptions<G>, 'columns' | 'data' | 'state' | 'getRowId' | 'getSubRows' | 'getCoreRowModel' | 'getExpandedRowModel' | 'onExpandedChange' | 'onRowSelectionChange' | 'getRowCanExpand'> {
    allowMultipleRowToggle: boolean;
    header: FC<{
        table: Table<G>;
    }>;
    rowCell: FC<CellContext<G, L>>;
}
export declare const useCascadeTable: <G extends GroupNode, L extends LeafNode>({ allowMultipleRowToggle, enableRowSelection, header: Header, rowCell: RowCell, ...rest }: TableProps<G, L>) => {
    readonly headerColumns: import("@tanstack/react-table").Header<G, unknown>[];
    readonly rows: Row<G>[];
};
interface TableRowAdapterArgs<G extends GroupNode> {
    rowInstance: Row<G>;
}
export declare function useAdaptedTable<G extends GroupNode>(tableInstance: Table<G>): {
    selectedRows: () => import("@tanstack/react-table").RowModel<G>;
};
export declare function getAdaptedTableRows<G extends GroupNode, L extends LeafNode>({ rowInstance, }: TableRowAdapterArgs<G>): {
    rowId: string;
    rowParentId: string | undefined;
    readonly rowData: G;
    readonly rowIsExpanded: boolean;
    readonly hasAllParentsExpanded: boolean;
    readonly rowDepth: number;
    readonly rowChildren: Row<G>[];
    readonly rowChildrenCount: number;
    readonly rowVisibleCells: Cell<G, L>[];
    isRowSelected: () => boolean;
    rowHasSelectedChildren: () => boolean;
    readonly rowCanSelect: () => boolean;
    rowSelectionFn: (event: unknown) => void;
    rowToggleFn: () => void;
};
export declare function useAdaptedTableRows<G extends GroupNode, L extends LeafNode>({ rowInstance, }: TableRowAdapterArgs<G>): {
    rowId: string;
    rowParentId: string | undefined;
    readonly rowData: G;
    readonly rowIsExpanded: boolean;
    readonly hasAllParentsExpanded: boolean;
    readonly rowDepth: number;
    readonly rowChildren: Row<G>[];
    readonly rowChildrenCount: number;
    readonly rowVisibleCells: Cell<G_1, L_1>[];
    isRowSelected: () => boolean;
    rowHasSelectedChildren: () => boolean;
    readonly rowCanSelect: () => boolean;
    rowSelectionFn: (event: unknown) => void;
    rowToggleFn: () => void;
};
/**
 * Container component that will render the configured table headers
 */
export declare function TableHeader<G extends GroupNode, L extends LeafNode>({ headerColumns, }: Pick<ReturnType<typeof useCascadeTable<G, L>>, 'headerColumns'>): React.JSX.Element[];
export declare function TableCellRender<G extends GroupNode, L extends LeafNode>({ cell, }: {
    cell: Cell<G, L>;
}): React.ReactNode | React.JSX.Element;
