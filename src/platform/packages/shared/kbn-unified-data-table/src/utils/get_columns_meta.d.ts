import type { DatatableColumn, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
type TextBasedColumnTypes = Record<string, DatatableColumnMeta>;
/**
 * Columns meta for text based searches
 * @param textBasedColumns
 */
export declare const getTextBasedColumnsMeta: (textBasedColumns: DatatableColumn[]) => TextBasedColumnTypes;
export {};
