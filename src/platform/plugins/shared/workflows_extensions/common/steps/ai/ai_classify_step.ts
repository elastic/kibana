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
 * Step type ID for the AI classify step.
 */
export const AiClassifyStepTypeId = 'ai.classify';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

/**
 * Input schema for the AI classify step.
 */
export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  categories: z.array(z.string()).min(1),
  instructions: z.string().optional(),
  allowMultipleCategories: z.boolean().optional(),
  fallbackCategory: z.string().optional(),
  includeRationale: z.boolean().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * Output schema for the AI classify step.
 * This is the base schema - the dynamic schema will be created based on input parameters.
 */
export const OutputSchema = z.object({
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  rationale: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
});

export type AiClassifyStepConfigSchema = typeof ConfigSchema;
export type AiClassifyStepInputSchema = typeof InputSchema;
export type AiClassifyStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI classify step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiClassifyStepCommonDefinition: CommonStepDefinition<
  AiClassifyStepInputSchema,
  AiClassifyStepOutputSchema,
  AiClassifyStepConfigSchema
> = {
  id: AiClassifyStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};

/**
 * Builds a dynamic Zod schema for structured output based on AI classification step inputs.
 */
export function buildStructuredOutputSchema(
  params: z.infer<AiClassifyStepInputSchema>
): typeof OutputSchema {
  const { allowMultipleCategories, includeRationale } = params;

  const shape: Record<string, z.ZodType> = {
    metadata: z.record(z.string(), z.any()),
  };

  if (allowMultipleCategories) {
    shape.categories = z.array(z.string());
  } else {
    shape.category = z.string();
  }

  if (includeRationale) {
    shape.rationale = z.string();
  }

  return z.object(shape) as typeof OutputSchema;
}
