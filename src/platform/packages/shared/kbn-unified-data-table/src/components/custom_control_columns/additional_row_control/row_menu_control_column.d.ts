import React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { RowControlColumn, RowControlRowProps } from '@kbn/discover-utils';
/**
 * Menu button under which all other additional row controls would be placed
 */
export declare const RowMenuControlCell: ({ getAvailableControls, startIndex, ...props }: EuiDataGridCellValueElementProps & {
    getAvailableControls: (rowProps: RowControlRowProps) => RowControlColumn[];
    /** Index into the available controls list from which menu items start. */
    startIndex?: number;
}) => React.JSX.Element | null;
export declare const getRowMenuControlColumn: (getAvailableControls: (rowProps: RowControlRowProps) => RowControlColumn[], startIndex?: number) => (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
