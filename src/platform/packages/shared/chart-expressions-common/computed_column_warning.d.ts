import type { DatatableColumn } from '@kbn/expressions-plugin/common';
export declare const isFilterableColumnSet: (columns: Array<DatatableColumn | undefined>) => boolean;
/**
 * Returns the warning message to show when filterable chart columns are computed ES|QL fields
 * that cannot be used for filtering.
 */
export declare const getFilterDrilldownWarningMessage: (columns: Array<DatatableColumn | undefined>) => string | undefined;
