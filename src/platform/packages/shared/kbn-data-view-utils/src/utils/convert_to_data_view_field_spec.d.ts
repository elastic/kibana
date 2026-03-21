import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
/**
 * Convert a datatable column to a DataViewFieldSpec
 */
export declare function convertDatatableColumnToDataViewFieldSpec(column: DatatableColumn): FieldSpec;
