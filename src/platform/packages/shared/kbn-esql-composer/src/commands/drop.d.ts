/**
 * Appends a `DROP` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param columns The columns to drop.
 * @returns A `QueryPipeline` instance with the `DROP` command appended.
 */
export declare function drop(...columns: Array<string | string[]>): import("../types").QueryOperator;
