import type { Filter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { Operator } from './filter_operators';
export declare function getFieldFromFilter(filter: Filter, indexPattern?: DataView): DataViewField | undefined;
export declare function getOperatorFromFilter(filter: Filter): Operator | undefined;
export declare function getFilterableFields(indexPattern: DataView): DataViewField[];
export declare function getOperatorOptions(field: DataViewField): Operator[];
export declare function validateParams(params: any, field: DataViewField): string | boolean | null;
export declare function isFilterValid(indexPattern?: DataView, field?: DataViewField, operator?: Operator, params?: any): string | boolean | null;
