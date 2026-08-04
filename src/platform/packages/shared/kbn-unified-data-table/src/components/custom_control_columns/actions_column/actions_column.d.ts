import type { EuiDataGridCellValueElementProps, EuiDataGridControlColumn, RenderCellValue } from '@elastic/eui';
import React from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
export declare const getActionsColumn: ({ baseColumns, externalControlColumns, rowAdditionalLeadingControls, visibleRowLeadingControls, }: {
    baseColumns: RenderCellValue[];
    rowAdditionalLeadingControls?: RowControlColumn[];
    externalControlColumns?: EuiDataGridControlColumn[];
    visibleRowLeadingControls?: number;
}) => {
    id: string;
    width: number;
    headerCellProps: {
        className: string;
    };
    rowCellRender: (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
    headerCellRender: () => React.JSX.Element;
} | null;
