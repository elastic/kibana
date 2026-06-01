/**
 * Detects top-level CHANGE_POINT commands so the Discover profile only activates for direct
 * change-point queries.
 * @param esql - The ES|QL query string
 */
export declare const hasChangePointCommand: (esql?: string) => boolean;
/**
 * Output column names for the CHANGE_POINT command (type and pvalue).
 * Defaults are 'type' and 'pvalue' unless the query uses AS type_name, pvalue_name.
 * These are needed to find annotation columns in the returned datatable.
 * @param esql - The ES|QL query string
 * @returns Object with typeColumn and pvalueColumn names, or undefined if no CHANGE_POINT command
 */
export declare const getChangePointOutputColumnNames: (esql?: string) => {
    typeColumn: string;
    pvalueColumn: string;
} | undefined;
/**
 * Metric (value) and time column names from the first CHANGE_POINT in the query (same rule as
 * {@link getChangePointOutputColumnNames}).
 * These names are needed to build the supporting line-chart query and pick timestamps from rows.
 */
export declare const getChangePointSeriesColumns: (esql?: string) => {
    valueColumn: string;
    timeColumn: string;
} | undefined;
export declare const formatEsqlIdentifier: (columnId: string) => string;
export declare const formatEsqlLiteral: (value: unknown) => string | undefined;
/**
 * Narrows the line-chart ES|QL to a specific entity row by appending a {@code | WHERE} clause.
 */
export declare const appendEntityFiltersToChangePointLineEsql: (lineEsql: string, row: Readonly<Record<string, unknown>>, entityColumnIds: readonly string[]) => string;
/**
 * Builds the ES|QL used as the Lens line-chart dataset: pipeline before CHANGE_POINT (trailing SORT
 * removed).
 * FORK queries are intentionally unsupported for line-series extraction.
 */
export declare const buildChangePointLineDataQuery: (esql?: string) => string | undefined;
