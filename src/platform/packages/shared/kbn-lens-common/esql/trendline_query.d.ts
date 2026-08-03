/**
 * Builds the BUCKET expression used for trendline time bucketing.
 *
 * Uses `AUTO_TARGET_NUMBER_OF_BUCKETS` (75) to match the bucket width that
 * Lens's form-based `auto` date_histogram produces when converting to ES|QL.
 *
 * Uses `esql.col()` to properly escape field names that contain special
 * characters (e.g. `order.date` → `` `order.date` ``).
 *
 * ES|QL uses the expression as written in the query as the result column name,
 * preserving `?_tstart` and `?_tend` literally (they are not substituted into
 * the column name). This means the column name is already stable across time
 * range changes without needing an alias.
 */
export declare const buildTrendlineBucketExpression: (timeField: string) => string;
/**
 * Returns true when the ES|QL query contains at least one STATS command.
 */
export declare const queryHasStatsCommand: (esqlQuery: string) => boolean;
/**
 * Appends a BUCKET time-bucketing clause to an ES|QL query for trendline use.
 *
 * Uses `@elastic/esql` AST parsing and manipulation for correct handling of
 * complex queries with proper field name escaping (e.g. dotted field names
 * are backtick-quoted).
 *
 * The query is parsed into an AST, the BUCKET expression is appended to the
 * appropriate STATS/BY clause, and the result is printed back to a string.
 *
 * Handles three cases:
 * - Query has `STATS ... BY ...` → appends BUCKET to the existing BY clause
 * - Query has `STATS` without `BY` → adds a BY clause with BUCKET
 * - Query has no `STATS` → appends a `STATS <agg> BY BUCKET(...)` command
 *
 * When the query has no STATS and `metricFields` are provided, each field is
 * wrapped in `AVG()` (e.g. `STATS AVG(bytes) BY BUCKET(...)`). When no metric
 * fields are given, it falls back to `STATS COUNT(*) BY BUCKET(...)`.
 */
export declare const appendTimeBucketToEsqlQuery: (esqlQuery: string, timeField: string, metricFields?: string[], groupByFields?: string[]) => string;
export interface TrendlineQueryWithMetricFieldMap {
    query: string;
    metricFieldMap: Map<string, string>;
}
/**
 * Builds a trendline ES|QL query and returns the generated metric result column names.
 *
 * When the source query has no STATS command, the trendline query adds AVG(<field>)
 * aggregations for the provided metric fields. The returned map keeps Lens column
 * fieldNames aligned with those generated ES|QL result columns.
 */
export declare const buildTrendlineQueryWithMetricFieldMap: (esqlQuery: string, timeField: string, metricFields?: string[], groupByFields?: string[]) => TrendlineQueryWithMetricFieldMap;
