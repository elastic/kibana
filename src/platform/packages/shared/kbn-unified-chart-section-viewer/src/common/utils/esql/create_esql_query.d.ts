import type { ParsedMetricItem } from '../../../types';
interface CreateESQLQueryParams {
    metricItem: ParsedMetricItem;
    splitAccessors?: string[];
    whereStatements?: string[];
    originalSource?: string;
}
/**
 * Creates a complete ESQL query string for metrics visualizations.
 * The function constructs a query that includes time series aggregation
 * and split accessors for dimension breakdowns.
 *
 * @param metric - The full metric field object, including dimension type information.
 * @param splitAccessors - An array of field names to use as split accessors in the BY clause.
 * @param whereStatements - Optional WHERE clause statements.
 * @param originalSource - The source the user typed in their query. When it is a single
 *   concrete index (e.g., a backing index), it is used as the chart query source instead
 *   of `metricItem.dataStream` so the chart's scope matches the scope METRICS_INFO scanned.
 * @returns A complete ESQL query string.
 */
export declare function createESQLQuery({ metricItem, splitAccessors, whereStatements, originalSource, }: CreateESQLQueryParams): string;
export {};
