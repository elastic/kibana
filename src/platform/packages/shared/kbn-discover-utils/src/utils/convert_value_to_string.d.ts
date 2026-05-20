import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord } from '../../types';
interface ConvertedResult {
    formattedString: string;
    withFormula: boolean;
}
export declare const convertValueToString: ({ dataView, dataViewField, flattenedValue, dataTableRecord, fieldFormats, options, }: {
    dataView: DataView;
    dataViewField?: DataViewField;
    flattenedValue: unknown;
    dataTableRecord: DataTableRecord;
    fieldFormats: FieldFormatsStart;
    options?: {
        compatibleWithCSV?: boolean;
        compatibleWithMarkdown?: boolean;
    };
}) => ConvertedResult;
export {};
