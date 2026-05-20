import type { EuiDataGridCellValueElementProps, EuiDataGridControlColumn, RenderCellValue } from '@elastic/eui';
import React from 'react';
import type { RowControlColumn } from '@kbn/discover-utils';
export declare const getActionsColumn: ({ baseColumns, externalControlColumns, rowAdditionalLeadingControls, }: {
    baseColumns: RenderCellValue[];
    rowAdditionalLeadingControls?: RowControlColumn[];
    externalControlColumns?: EuiDataGridControlColumn[];
}) => {
    id: string;
    width: number;
    headerCellProps: {
        className: string;
    };
    rowCellRender: (props: EuiDataGridCellValueElementProps) => React.JSX.Element;
    headerCellRender: () => React.JSX.Element;
} | null;
