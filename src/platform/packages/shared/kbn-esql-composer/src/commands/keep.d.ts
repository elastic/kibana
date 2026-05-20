/**
 * Appends a `KEEP` command to the ESQL composer pipeline.
 *
 * @deprecated Migrate to `@kbn/esql-language` composer.
 * @param columns The columns to keep.
 * @returns A `QueryPipeline` instance with the `KEEP` command appended.
 */
export declare function keep(...columns: Array<string | string[]>): import("../types").QueryOperator;
