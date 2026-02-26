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
const MAP_BINDING_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

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
            item: z.string().regex(MAP_BINDING_IDENTIFIER_REGEX).optional(),
            index: z.string().regex(MAP_BINDING_IDENTIFIER_REGEX).optional(),
          })
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
