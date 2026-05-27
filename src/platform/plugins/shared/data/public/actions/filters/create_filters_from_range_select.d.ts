import type { Datatable } from '@kbn/expressions-plugin/common';
import { type AggregateQuery } from '@kbn/es-query';
export interface RangeSelectDataContext {
    table: Datatable;
    column: number;
    range: number[];
    timeFieldName?: string;
    query?: AggregateQuery;
}
export declare function createFiltersFromRangeSelectAction(event: RangeSelectDataContext): Promise<import("@kbn/es-query").Filter[]>;
