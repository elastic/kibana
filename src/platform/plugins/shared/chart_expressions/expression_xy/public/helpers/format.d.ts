import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare const getFormat: (columns: DatatableColumn[], accessor: string | ExpressionValueVisDimension) => import("@kbn/field-formats-plugin/common").SerializedFieldFormat | undefined;
/**
 * Reads a single key from the field format's params, unwrapping decorator formats such as `suffix` by
 * walking nested `params.params` until the key is found or `maxDepth` is reached.
 */
export declare const getFormatParam: (format: FieldFormat, param: string, maxDepth?: number) => string | number | boolean | import("@kbn/utility-types").SerializableRecord | import("@kbn/utility-types/src/serializable").SerializableArray | null | undefined;
export declare const getDecimalsFromFormat: (format: FieldFormat) => number | undefined;
