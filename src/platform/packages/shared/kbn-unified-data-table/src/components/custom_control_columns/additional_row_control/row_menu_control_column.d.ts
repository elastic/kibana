import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { RowControlColumn } from '@kbn/discover-utils';
/**
 * Menu button under which all other additional row controls would be placed
 */
export declare const RowMenuControlCell: ({ rowControlColumns, ...props }: EuiDataGridCellValueElementProps & {
    rowControlColumns: RowControlColumn[];
}) => React.JSX.Element;
export declare const getRowMenuControlColumn: (rowControlColumns: RowControlColumn[]) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
