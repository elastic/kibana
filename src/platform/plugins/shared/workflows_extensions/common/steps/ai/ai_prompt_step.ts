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
 * Step type ID for the AI prompt step.
 */
export const AiPromptStepTypeId = 'ai.prompt';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

/**
 * Input schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const InputSchema = z.object({
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  // TODO: replace with proper JsonSchema7 zod schema when https://github.com/elastic/kibana/pull/244223 is merged and released
  outputSchema: z.any().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export function getStructuredOutputSchema(contentSchema: z.ZodType) {
  return z.object({
    content: contentSchema,
  });
}

const stringOutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()),
});

/**
 * Output schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const OutputSchema = z.union([stringOutputSchema, getStructuredOutputSchema(z.unknown())]);

export type AiPromptStepConfigSchema = typeof ConfigSchema;
export type AiPromptStepInputSchema = typeof InputSchema;
export type AiPromptStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI prompt step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiPromptStepCommonDefinition: CommonStepDefinition<
  AiPromptStepInputSchema,
  AiPromptStepOutputSchema,
  AiPromptStepConfigSchema
> = {
  id: AiPromptStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
