/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataMapStepTypeId = 'data.map';

export const ConfigSchema = z.object({
  items: z.unknown(),
});

/** Reserved key that triggers array iteration in a nested field spec. */
export const MAP_DIRECTIVE = '$map';

/**
 * The value of the `$map` directive inside a nested field spec.
 *   - `items` (required): a reference path resolved from the current context (e.g. `"item.tags"`).
 *   - `item` (optional): the variable name each element is bound to. Defaults to `"item"`.
 *   - `index` (optional): the variable name for the iteration index. Defaults to `"index"`.
 */
export interface MapDirectiveValue {
  /** A reference path resolved from the current context (e.g. `"item.tags"`). */
  items: string;
  /** The variable name each element is bound to (e.g. `"tag"`). Defaults to `"item"`. */
  item?: string;
  /** The variable name for the iteration index (e.g. `"tag_index"`). Defaults to `"index"`. */
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
 * `items` is resolved from the current context. Each element is bound to the name given
 * by `item` (defaults to `"item"`) and the iteration index to `index` (defaults to `"index"`).
 * All ancestor variables remain in scope.
 *
 * Objects without `$map` are literal nesting: rendered with the current context.
 */
// export type FieldsNode = { $map?: MapDirectiveValue } & {
//   [key: string]: string | FieldsNode;
// };

export type FieldsNode =
  | ({
      [MAP_DIRECTIVE]?: MapDirectiveValue;
    } & { [key: string]: FieldsNode })
  | string;

const FieldsNodeSchema: z.ZodType<FieldsNode> = z.lazy(() =>
  z.union([
    z.string(),
    z
      .object({
        [MAP_DIRECTIVE]: z
          .object({
            items: z.string(),
            item: z.string().optional(),
            index: z.string().optional(),
          })
          .describe(
            'The $map directive. Use "items" to reference the array to iterate over, "item" to reference the bound variable name, and "index" to reference the current index.'
          )
          .optional(),
      })
      .and(z.record(z.string(), z.union([z.string(), FieldsNodeSchema]))),
  ])
);

export const InputSchema = z.object({ fields: z.record(z.string(), FieldsNodeSchema) });

export const OutputSchema = z.union([
  z.array(z.record(z.string(), z.unknown())),
  z.record(z.string(), z.unknown()),
]);

export type DataMapStepConfigSchema = typeof ConfigSchema;
export type DataMapStepInputSchema = typeof InputSchema;
export type DataMapStepOutputSchema = typeof OutputSchema;

export const dataMapStepCommonDefinition: CommonStepDefinition<
  DataMapStepInputSchema,
  DataMapStepOutputSchema,
  DataMapStepConfigSchema
> = {
  id: DataMapStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
