import type { Params } from '../types';
/**
 * Appends a `STATS` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param body The body of the `STATS` command.
 * @param params The parameters to use in the `STATS` command.
 * @returns A `QueryPipeline` instance with the `STATS` command appended.
 */
export declare function stats<TQuery extends string, TParams extends Params<TQuery>>(body: TQuery, params?: TParams): import("../types").QueryOperator;
