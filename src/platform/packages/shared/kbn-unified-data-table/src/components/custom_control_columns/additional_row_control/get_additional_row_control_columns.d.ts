import type { RowControlColumn } from '@kbn/discover-utils';
import type { RenderCellValue } from '@elastic/eui';
export declare const DEFAULT_VISIBLE_ROW_LEADING_CONTROLS = 2;
export declare const getAdditionalRowControlColumns: (rowControlColumns: RowControlColumn[], visibleRowLeadingControls?: number) => {
    totalWidth: number;
    columns: RenderCellValue[];
};
