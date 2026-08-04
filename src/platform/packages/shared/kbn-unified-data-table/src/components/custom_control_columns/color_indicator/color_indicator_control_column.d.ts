import type { EuiDataGridControlColumn, EuiThemeComputed, EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
interface ColorIndicatorCellParams {
    rowIndex: EuiDataGridCellValueElementProps['rowIndex'];
    setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
    getRowIndicator: (row: DataTableRecord, euiTheme: EuiThemeComputed) => {
        color: string;
        label: string;
    } | undefined;
}
export interface ColorIndicatorControlColumnParams {
    getRowIndicator: ColorIndicatorCellParams['getRowIndicator'];
}
export declare const getColorIndicatorControlColumn: ({ getRowIndicator, }: ColorIndicatorControlColumnParams) => EuiDataGridControlColumn;
export {};
