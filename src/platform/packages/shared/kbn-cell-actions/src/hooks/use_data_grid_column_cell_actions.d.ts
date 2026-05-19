import type { MutableRefObject } from 'react';
import { type EuiDataGridColumnCellAction, type EuiDataGridRefProps } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { CellActionsProps, CellActionFieldValue } from '../types';
export interface UseDataGridColumnsCellActionsProps extends Pick<CellActionsProps, 'metadata' | 'disabledActionTypes'> {
    /**
     * Optional trigger ID to used to retrieve the cell actions.
     * returns empty array if not provided
     */
    triggerId?: string;
    /**
     * fields array, used to determine which actions to load.
     * returns empty array if not provided
     */
    fields?: FieldSpec[];
    /**
     * Function to get the cell value for a given field name and row index.
     * the `rowIndex` parameter is absolute, not relative to the current page
     */
    getCellValue: (fieldName: string, rowIndex: number) => CellActionFieldValue;
    /**
     * ref to the EuiDataGrid instance
     */
    dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
    /**
     * If true, disables all cell actions
     */
    disableCellActions?: boolean;
}
export type UseDataGridColumnsCellActions<P extends UseDataGridColumnsCellActionsProps = UseDataGridColumnsCellActionsProps> = (props: P) => EuiDataGridColumnCellAction[][];
export declare const useDataGridColumnsCellActions: UseDataGridColumnsCellActions;
