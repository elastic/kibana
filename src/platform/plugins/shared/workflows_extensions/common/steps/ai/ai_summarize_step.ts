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

/**
 * Step type ID for the AI summarize step.
 */
export const AiSummarizeStepTypeId = 'ai.summarize';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

/**
 * Input schema for the AI summarize step.
 */
export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  instructions: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * Output schema for the AI summarize step.
 */
export const OutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AiSummarizeStepConfigSchema = typeof ConfigSchema;
export type AiSummarizeStepInputSchema = typeof InputSchema;
export type AiSummarizeStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI summarize step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiSummarizeStepCommonDefinition: CommonStepDefinition<
  AiSummarizeStepInputSchema,
  AiSummarizeStepOutputSchema,
  AiSummarizeStepConfigSchema
> = {
  id: AiSummarizeStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
