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

export const DataFilterStepTypeId = 'data.filter';

export const ConfigSchema = z.object({
  items: z.unknown(),
});

export const InputSchema = z.object({
  condition: z.string(),
  limit: z.number().positive().optional(),
});

export const OutputSchema = z.array(z.unknown());

export type DataFilterStepConfigSchema = typeof ConfigSchema;
export type DataFilterStepInputSchema = typeof InputSchema;
export type DataFilterStepOutputSchema = typeof OutputSchema;

export const dataFilterStepCommonDefinition: CommonStepDefinition<
  DataFilterStepInputSchema,
  DataFilterStepOutputSchema,
  DataFilterStepConfigSchema
> = {
  id: DataFilterStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
