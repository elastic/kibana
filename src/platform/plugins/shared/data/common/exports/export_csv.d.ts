import type { Datatable } from '@kbn/expressions-plugin/common';
import type { FormatFactory } from '@kbn/field-formats-plugin/common';
export declare const LINE_FEED_CHARACTER = "\r\n";
export declare const CSV_MIME_TYPE = "text/plain;charset=utf-8";
interface CSVOptions {
    csvSeparator: string;
    quoteValues: boolean;
    escapeFormulaValues: boolean;
    formatFactory: FormatFactory;
    raw?: boolean;
}
export declare function datatableToCSV({ columns, rows }: Datatable, { csvSeparator, quoteValues, formatFactory, raw, escapeFormulaValues }: CSVOptions): string;
export {};
