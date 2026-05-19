import type { Params } from '../types';
/**
 * Appends an `RENAME` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param body The body of the `RENAME` command.
 * @param params The parameters to use in the `RENAME` command.
 * @returns A `QueryPipeline` instance with the `RENAME` command appended.
 */
export declare function rename<TQuery extends string, TParams extends Params<TQuery>>(body: TQuery, params?: TParams): import("../types").QueryOperator;
