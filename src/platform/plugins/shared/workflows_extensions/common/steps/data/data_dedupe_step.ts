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

export const DataDedupeStepTypeId = 'data.dedupe' as const;

export const ConfigSchema = z.object({
  items: z.array(z.unknown()),
  strategy: z.enum(['keep_first', 'keep_last']).optional().default('keep_first'),
});

export const InputSchema = z.object({
  keys: z.array(z.string()),
});

export const OutputSchema = z.array(z.unknown());

export type DataDedupeStepConfigSchema = typeof ConfigSchema;
export type DataDedupeStepInputSchema = typeof InputSchema;
export type DataDedupeStepOutputSchema = typeof OutputSchema;

export const dataDedupeStepCommonDefinition: CommonStepDefinition<
  DataDedupeStepInputSchema,
  DataDedupeStepOutputSchema,
  DataDedupeStepConfigSchema
> = {
  id: DataDedupeStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
