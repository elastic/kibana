import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';
export declare const DataMapStepTypeId = "data.map";
export declare const ConfigSchema: z.ZodObject<{
    items: z.ZodUnknown;
}, z.core.$strip>;
/** Reserved key that triggers array iteration in a nested field spec. */
export declare const MAP_DIRECTIVE = "$map";
/**
 * The value of the `$map` directive inside a nested field spec.
 *   - `items` (required): a Liquid template expression that resolves to an array
 *     (e.g. `"${{ item.tags }}"`). Rendered using the current context just like any other field.
 *   - `item` (optional): the variable name each element is bound to. Defaults to `"item"`.
 *     Must match `[a-zA-Z_][a-zA-Z0-9_]*`.
 *   - `index` (optional): the variable name for the iteration index. Defaults to `"index"`.
 *     Must match `[a-zA-Z_][a-zA-Z0-9_]*`.
 */
export interface MapDirectiveValue {
    /** A Liquid template expression that resolves to an array (e.g. `"${{ item.tags }}"`). */
    items: string;
    /**
     * The variable name each element is bound to (e.g. `"tag"`). Defaults to `"item"`.
     * Must match `[a-zA-Z_][a-zA-Z0-9_]*`.
     */
    item?: string;
    /**
     * The variable name for the iteration index (e.g. `"tag_index"`). Defaults to `"index"`.
     * Must match `[a-zA-Z_][a-zA-Z0-9_]*`.
     */
    index?: string;
}
/**
 * Recursive field specification for `data.map`.
 *
 * A FieldsNode value can be:
 *   - a string (leaf — rendered as a template expression)
 *   - an object whose values are FieldsNode (tree-branch)
 *
 * Array mapping (`$map`): A nested object may contain the reserved `$map` key whose value
 * is `{ items, item?, index? }`. When present, the field produces an **array** in the output.
 * `items` is a Liquid template expression (e.g. `"${{ item.tags }}"`) rendered using the
 * current context — the same rendering used for all other field values. Each element is bound
 * to the name given by `item` (defaults to `"item"`) and the iteration index to `index`
 * (defaults to `"index"`). All ancestor variables remain in scope.
 *
 * Objects without `$map` are literal nesting: rendered with the current context.
 */
export type FieldsNode = ({
    [MAP_DIRECTIVE]?: MapDirectiveValue;
} & {
    [key: string]: FieldsNode;
}) | string;
export declare const InputSchema: z.ZodObject<{
    fields: z.ZodRecord<z.ZodString, z.ZodType<FieldsNode, unknown, z.core.$ZodTypeInternals<FieldsNode, unknown>>>;
}, z.core.$strip>;
export declare const OutputSchema: z.ZodUnion<readonly [z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
export type DataMapStepConfigSchema = typeof ConfigSchema;
export type DataMapStepInputSchema = typeof InputSchema;
export type DataMapStepOutputSchema = typeof OutputSchema;
export declare const dataMapStepCommonDefinition: CommonStepDefinition<DataMapStepInputSchema, DataMapStepOutputSchema, DataMapStepConfigSchema>;
