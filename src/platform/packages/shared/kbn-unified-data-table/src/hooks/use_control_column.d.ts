import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
export declare const useControlColumn: ({ rowIndex, setCellProps, }: Pick<EuiDataGridCellValueElementProps, "rowIndex" | "setCellProps">) => {
    record?: DataTableRecord;
    rowIndex: number;
};
