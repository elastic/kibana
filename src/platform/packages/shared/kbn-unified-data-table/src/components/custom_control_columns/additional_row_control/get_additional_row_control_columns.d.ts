import type { RowControlColumn } from '@kbn/discover-utils';
import type { RenderCellValue } from '@elastic/eui';
export declare const getAdditionalRowControlColumns: (rowControlColumns: RowControlColumn[]) => {
    totalWidth: number;
    columns: RenderCellValue[];
};
