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

export const DataConcatStepTypeId = 'data.concat' as const;

export const ConfigSchema = z.object({
  arrays: z.array(z.unknown()),
});

export const InputSchema = z.object({
  dedupe: z.boolean().optional().default(false),
  flatten: z
    .union([z.boolean(), z.number().int().min(1).max(10)])
    .optional()
    .default(false),
});

export const OutputSchema = z.array(z.unknown());

export type DataConcatStepConfigSchema = typeof ConfigSchema;
export type DataConcatStepInputSchema = typeof InputSchema;
export type DataConcatStepOutputSchema = typeof OutputSchema;

export const dataConcatStepCommonDefinition: CommonStepDefinition<
  DataConcatStepInputSchema,
  DataConcatStepOutputSchema,
  DataConcatStepConfigSchema
> = {
  id: DataConcatStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
