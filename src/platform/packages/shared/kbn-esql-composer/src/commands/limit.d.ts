/**
 * Appends a `LIMIT` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param value The limit to apply.
 * @returns A `QueryPipeline` instance with the `LIMIT` command appended.
 */
export declare function limit(value: number): import("../types").QueryOperator;
