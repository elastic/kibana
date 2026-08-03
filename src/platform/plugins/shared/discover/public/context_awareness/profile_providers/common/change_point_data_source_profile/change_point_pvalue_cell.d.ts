import type { FC } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
export interface ChangePointPvalueCellContext {
    pvalueColumnId: string;
}
interface ChangePointPvalueCellProps extends DataGridCellValueElementProps {
    context: ChangePointPvalueCellContext;
}
export declare const ChangePointPvalueCell: FC<ChangePointPvalueCellProps>;
export {};
