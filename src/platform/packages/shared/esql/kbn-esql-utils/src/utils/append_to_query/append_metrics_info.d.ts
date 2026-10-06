/**
 * Appends "| METRICS_INFO" to an ES|QL query if it has no transformational commands.
 * SORT is removed; LIMIT, if present, is re-appended at the end.
 * When `dimensions` are provided, a pre-METRICS_INFO `WHERE ... IS NOT NULL`
 * (document-level) filter is added. `postFilter`, if provided, is appended as a
 * generic `WHERE` clause after METRICS_INFO (before LIMIT).
 * @param esql the ES|QL query.
 * @param dimensions selected dimension field names for the pre-METRICS_INFO IS NOT NULL filter.
 * @param postFilter caller-supplied WHERE clause to apply after METRICS_INFO.
 * @returns the query with "| METRICS_INFO" added, or an empty string if not allowed.
 */
export declare function buildMetricsInfoQuery(esql?: string, dimensions?: string[], postFilter?: string): string;
