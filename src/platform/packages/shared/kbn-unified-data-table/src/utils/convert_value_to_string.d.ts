import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
interface ConvertedResult {
    formattedString: string;
    withFormula: boolean;
}
export declare const convertValueToString: ({ rowIndex, rows, columnId, dataView, fieldFormats, columnsMeta, options, }: {
    rowIndex: number;
    rows: DataTableRecord[];
    columnId: string;
    dataView: DataView;
    fieldFormats: FieldFormatsStart;
    columnsMeta: DataTableColumnsMeta | undefined;
    options?: {
        compatibleWithCSV?: boolean;
    };
}) => ConvertedResult;
export declare const convertNameToString: (name: string) => ConvertedResult;
export {};
