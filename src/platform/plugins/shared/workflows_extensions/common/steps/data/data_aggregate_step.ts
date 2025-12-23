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

export const DataAggregateStepTypeId = 'data.aggregate' as const;

export const MetricSchema = z.object({
  type: z.enum(['sum', 'avg', 'min', 'max', 'count']),
  field: z.string(),
});

export const ConfigSchema = z.object({
  items: z.unknown(),
});

export const InputSchema = z.object({
  group_by: z.union([z.string(), z.array(z.string())]),
  metrics: z.record(z.string(), MetricSchema),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.number().positive().optional(),
});

export const OutputSchema = z.array(z.record(z.string(), z.unknown()));

export type DataAggregateStepConfigSchema = typeof ConfigSchema;
export type DataAggregateStepInputSchema = typeof InputSchema;
export type DataAggregateStepOutputSchema = typeof OutputSchema;

export const dataAggregateStepCommonDefinition: CommonStepDefinition<
  DataAggregateStepInputSchema,
  DataAggregateStepOutputSchema,
  DataAggregateStepConfigSchema
> = {
  id: DataAggregateStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
