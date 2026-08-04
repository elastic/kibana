import type { Params } from '../types';
/**
 * Appends an `EVAL` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param body The body of the `EVAL` command.
 * @param params The parameters to use in the `EVAL` command.
 * @returns A `QueryPipeline` instance with the `EVAL` command appended.
 */
export declare function evaluate<TQuery extends string, TParams extends Params<TQuery>>(body: TQuery, params?: TParams): import("../types").QueryOperator;
