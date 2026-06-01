/**
 * Appends "| METRICS_INFO" to an ES|QL query if it has no transformational commands.
 * SORT is removed from the query. LIMIT, if present, is appended after METRICS_INFO.
 * @param esql the ES|QL query.
 * @returns the query with "| METRICS_INFO" added, or an empty string if not allowed.
 */
export declare function buildMetricsInfoQuery(esql?: string, dimensions?: string[]): string;
