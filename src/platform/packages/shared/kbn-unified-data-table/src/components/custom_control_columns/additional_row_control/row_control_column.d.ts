import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { RowControlColumn } from '@kbn/discover-utils';
export declare const RowControlCell: ({ rowControlColumn, ...props }: EuiDataGridCellValueElementProps & {
    rowControlColumn: RowControlColumn;
}) => React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
export declare const getRowControlColumn: (rowControlColumn: RowControlColumn) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
