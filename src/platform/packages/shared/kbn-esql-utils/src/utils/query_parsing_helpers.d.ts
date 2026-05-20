import type { ESQLFunction, ESQLColumn } from '@elastic/esql/types';
import { type ESQLControlVariable } from '@kbn/esql-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { monaco } from '@kbn/monaco';
export declare function getRemoteClustersFromESQLQuery(esql?: string): string[] | undefined;
/**
 * Determines if an ES|QL query contains transformational commands.
 *
 * For ES|QL, we consider the following as transformational commands:
 * - `stats`: Performs aggregations and transformations
 * - `keep`: Filters and selects specific fields
 * - `fork` commands where ALL branches contain only transformational commands
 *
 * @param esql - The ES|QL query string to analyze
 * @returns true if the query contains transformational commands or fork commands with all transformational branches
 *
 * @example
 * hasTransformationalCommand('from index | stats count() by field') // true
 * hasTransformationalCommand('from index | keep field1, field2') // true
 * hasTransformationalCommand('from index | fork (stats count()) (keep field)') // true
 * hasTransformationalCommand('from index | fork (where x > 0) (eval y = x * 2)') // false
 * hasTransformationalCommand('from index | where field > 0') // false
 */
export declare function hasTransformationalCommand(esql?: string): boolean;
export declare function getLimitFromESQLQuery(esql: string): number;
export declare function removeDropCommandsFromESQLQuery(esql?: string): string;
/**
 * Converts timeseries (TS) commands to FROM commands in an ES|QL query
 * @param esql - The ES|QL query string
 * @returns The modified query with TS commands converted to FROM commands
 */
export declare function convertTimeseriesCommandToFrom(esql?: string): string;
/**
 * When the ?_tstart and ?_tend params are used, we want to retrieve the timefield from the query.
 * @param esql:string
 * @returns string
 */
export declare const getTimeFieldFromESQLQuery: (esql: string) => string | undefined;
export declare const getKqlSearchQueries: (esql: string) => string[];
/**
 * Prettifies an ES|QL query with configurable line wrapping.
 * @param src - The raw ES|QL query string
 * @param lineWidth - Optional line width in characters; when provided, output is wrapped to fit. Otherwise uses the library default (80).
 */
export declare const prettifyQuery: (src: string, lineWidth?: number) => string;
export declare const retrieveMetadataColumns: (esql: string) => string[];
export declare const getQueryColumnsFromESQLQuery: (esql: string) => string[];
export declare const getESQLQueryVariables: (esql: string) => string[];
/**
 * This function is used to map the variables to the columns in the datatable
 * @param esql:string
 * @param variables:ESQLControlVariable[]
 * @param columns:DatatableColumn[]
 * @returns DatatableColumn[]
 */
export declare const mapVariableToColumn: (esql: string, variables: ESQLControlVariable[], columns: DatatableColumn[]) => DatatableColumn[];
export declare const getQueryUpToCursor: (queryString: string, cursorPosition?: monaco.Position) => string;
/**
 * Finds the column closest to the given cursor position within an array of columns.
 *
 * @param columns An array of ES|QL columns.
 * @param cursorPosition The current cursor position.
 * @returns The column object closest to the cursor, or null if the columns array is empty.
 */
export declare function findClosestColumn(columns: ESQLColumn[], cursorPosition?: monaco.Position): ESQLColumn | undefined;
export declare const getValuesFromQueryField: (queryString: string, cursorPosition?: monaco.Position) => string | undefined;
export declare const fixESQLQueryWithVariables: (queryString: string, esqlVariables?: ESQLControlVariable[]) => string;
export declare const getCategorizeColumns: (esql: string) => string[];
export declare const getSparklineColumns: (esql: string) => string[];
/**
 * Extracts the original and renamed columns from a rename function.
 * RENAME original AS renamed Vs RENAME renamed = original
 * @param renameFunction
 */
export declare const getArgsFromRenameFunction: (renameFunction: ESQLFunction) => {
    original: ESQLColumn;
    renamed: ESQLColumn;
};
/**
 * Extracts the fields used in the CATEGORIZE function from an ESQL query.
 * @param esql: string - The ESQL query string
 */
export declare const getCategorizeField: (esql: string) => string[];
export declare const hasLimitBeforeAggregate: (esql: string) => boolean;
export declare const missingSortBeforeLimit: (esql: string) => boolean;
/**
 * Checks if the ESQL query contains only source commands (e.g., FROM, TS).
 * If the query contains PROMQL command, we will exclude it from this check.
 * @param esql: string - The ESQL query string
 * @returns true if the query contains only source commands, false otherwise
 */
export declare const hasOnlySourceCommand: (query: string) => boolean;
/**
 * Determines if an ES|QL query contains the METRICS_INFO or TS_INFO commands.
 *
 * @param esql - The ES|QL query string to analyze
 * @returns true if the query contains the METRICS_INFO or TS_INFO commands, false otherwise
 */
export declare const hasTimeseriesInfoCommand: (esql?: string) => boolean;
