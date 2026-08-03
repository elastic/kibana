import type { Params } from '../types';
/**
 * Appends a `WHERE` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param body The body of the `WHERE` command.
 * @param params The parameters to use in the `WHERE` command.
 * @returns A `QueryPipeline` instance with the `WHERE` command appended.
 */
export declare function where<TQuery extends string, TParams extends Params<TQuery>>(body: TQuery, params?: TParams): import("../types").QueryOperator;
