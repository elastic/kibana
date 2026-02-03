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

/**
 * Input schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const InputSchema = z.object({
  prompt: z.string(),
  connectorId: z.string().optional(),
  // TODO: replace with proper JsonSchema7 zod schema when https://github.com/elastic/kibana/pull/244223 is merged and released
  outputSchema: z.any().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * Output schema for the AI prompt step.
 * Uses variables structure with key->value pairs.
 */
export const OutputSchema = z.object({
  content: z.any(),
  response_metadata: z.record(z.string(), z.any()).optional(),
});

export type AiPromptStepInputSchema = typeof InputSchema;
export type AiPromptStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI prompt step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiPromptStepCommonDefinition: CommonStepDefinition<
  AiPromptStepInputSchema,
  AiPromptStepOutputSchema
> = {
  id: AiPromptStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
