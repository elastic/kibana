import type { DataView } from '@kbn/data-views-plugin/public';
export declare const SOURCE_COLUMN = "_source";
/**
 * Function to provide fallback when
 * 1) no columns are given
 * 2) Just one column is given, which is the configured timefields
 */
export declare function getDisplayedColumns(stateColumns: string[] | undefined, dataView: DataView): string[];
export declare function getInnerColumns(fields: Record<string, unknown[]>, columnId: string): {
    [k: string]: unknown[];
};
