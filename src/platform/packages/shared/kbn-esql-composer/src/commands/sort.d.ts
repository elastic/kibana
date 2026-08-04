import type { Params, QueryOperator } from '../types';
/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export declare enum SortOrder {
    Asc = "ASC",
    Desc = "DESC"
}
type Sort = Record<string, SortOrder>;
type SortArgs = Sort | string | Array<Sort | string>;
/**
 * Appends a `SORT` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param sorts The sort criteria.
 * @returns A `QueryPipeline` instance with the `SORT` command appended.
 */
export declare function sort<TQuery extends string, TParams extends Params<TQuery>>(body: TQuery, params?: TParams): QueryOperator;
export declare function sort(...sorts: SortArgs[]): QueryOperator;
export {};
