import type { ScriptedRangeFilter, RangeFilter, Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getRangeDisplayValue({ meta: { params } }: RangeFilter | ScriptedRangeFilter, formatter?: FieldFormat): string;
export declare const isMapRangeFilter: (filter: any) => filter is RangeFilter;
export declare const mapRange: (filter: Filter) => {
    type: FILTERS;
    key: string;
    value: any;
    params: any;
};
