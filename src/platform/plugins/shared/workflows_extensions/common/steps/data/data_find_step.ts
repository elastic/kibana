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

export const DataFindStepTypeId = 'data.find';

export const ConfigSchema = z.object({
  items: z.unknown(),
});

export const InputSchema = z.object({
  condition: z.string(),
  errorIfEmpty: z.boolean().optional(),
});

export const OutputSchema = z.object({
  item: z.unknown().nullable(),
  index: z.number().nullable(),
});

export type DataFindStepConfigSchema = typeof ConfigSchema;
export type DataFindStepInputSchema = typeof InputSchema;
export type DataFindStepOutputSchema = typeof OutputSchema;

export const dataFindStepCommonDefinition: CommonStepDefinition<
  DataFindStepInputSchema,
  DataFindStepOutputSchema,
  DataFindStepConfigSchema
> = {
  id: DataFindStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
