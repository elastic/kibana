import React from 'react';
import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { IToasts } from '@kbn/core/public';
import type { FieldRow } from './field_row';
interface TableActionsProps {
    Component: EuiDataGridColumnCellActionProps['Component'];
    row: FieldRow | undefined;
    isEsqlMode: boolean | undefined;
    columns?: string[];
    hideFilteringOnComputedColumns?: boolean;
}
type CheckFilterParams = Pick<TableActionsProps, 'row' | 'hideFilteringOnComputedColumns'> & {
    onFilter: DocViewFilterFn | undefined;
};
export declare function getFilterInOutPairDisabledWarning(params: CheckFilterParams): string | undefined;
export declare function getFilterExistsDisabledWarning(params: CheckFilterParams): string | undefined;
export declare function getFieldCellActions({ rows, columns, isEsqlMode, hideFilteringOnComputedColumns, onFilter, onToggleColumn, }: {
    rows: FieldRow[];
    columns?: string[];
    isEsqlMode: boolean | undefined;
    hideFilteringOnComputedColumns?: boolean;
    onFilter?: DocViewFilterFn;
    onToggleColumn: ((field: string) => void) | undefined;
}): (({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => React.JSX.Element)[];
export declare function getFieldValueCellActions({ rows, isEsqlMode, hideFilteringOnComputedColumns, onFilter, toasts, }: {
    rows: FieldRow[];
    isEsqlMode: boolean | undefined;
    hideFilteringOnComputedColumns?: boolean;
    onFilter?: DocViewFilterFn;
    toasts: IToasts;
}): (({ Component, rowIndex }: EuiDataGridColumnCellActionProps) => React.JSX.Element)[];
export {};
