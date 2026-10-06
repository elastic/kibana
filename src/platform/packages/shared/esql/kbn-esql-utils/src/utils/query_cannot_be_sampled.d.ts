import type { AggregateQuery, Query } from '@kbn/es-query';
/**
 * Check if the query contains any of the function names being passed in
 * @param query
 * @param functions list of function names to check for
 * @returns
 */
export declare const queryContainsFunction: (query: AggregateQuery | Query | {
    [key: string]: any;
} | undefined | null, functions: string[]) => boolean;
/**
 * Check if the query contains any function that cannot be used after LIMIT clause
 * @param query
 * @returns
 */
export declare const queryCannotBeSampled: (query: AggregateQuery | Query | {
    [key: string]: any;
} | undefined | null) => boolean;
