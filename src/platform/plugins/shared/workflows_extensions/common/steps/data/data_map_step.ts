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

/** Recursive node: string (dot-path or key) or { [key]: PickNode[] } for nested list format */
type PickNode = string | Record<string, PickNode[]>;
const PickNodeSchema: z.ZodType<PickNode> = z.lazy(() =>
  z.union([z.string(), z.record(z.string(), z.array(PickNodeSchema))])
);
const PickSchema = z.union([z.record(z.string(), z.unknown()), z.array(PickNodeSchema)]);

export const InputSchema = z.object({
  fields: z.record(z.string(), z.unknown()).optional(),
  transform: z.object({ pick: PickSchema.optional() }).optional(),
});

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
