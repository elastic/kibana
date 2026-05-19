import type { Datatable } from '@kbn/expressions-plugin/public';
import type { Filter } from '@kbn/es-query';
import { type AggregateQuery } from '@kbn/es-query';
export interface ValueClickDataContext {
    data: Array<{
        table: Pick<Datatable, 'rows' | 'columns' | 'meta'>;
        column: number;
        row: number;
        value: any;
    }>;
    timeFieldName?: string;
    negate?: boolean;
    query?: AggregateQuery;
}
/**
 * Assembles the filters needed to apply filtering against a specific cell value, while accounting
 * for cases like if the value is a terms agg in an `__other__` or `__missing__` bucket.
 *
 * @param  {EventData['table']} table - tabified table data
 * @param  {number} columnIndex - current column index
 * @param  {number} rowIndex - current row index
 * @param  {string} cellValue - value of the current cell
 * @return {Filter[]|undefined} - list of filters to provide to queryFilter.addFilters()
 */
export declare const createFilter: (table: Pick<Datatable, "rows" | "columns">, columnIndex: number, rowIndex: number) => Promise<Filter[] | undefined>;
export declare const createFilterESQL: (table: Pick<Datatable, "rows" | "columns">, columnIndex: number, rowIndex: number) => Promise<Filter[]>;
/** @public */
export declare const createFiltersFromValueClickAction: ({ data, negate, }: ValueClickDataContext) => Promise<Filter[]>;
/** @public */
export declare const appendFilterToESQLQueryFromValueClickAction: ({ data, query, negate, }: ValueClickDataContext) => string | undefined;
