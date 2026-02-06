/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the external step.
 */
export const ExternalStepTypeId = 'example.externalStep';

/**
 * Input schema for the external step.
 */
export const InputSchema = z.object({
  input: z.string(),
});

/**
 * Output schema for the external step.
 * Returns simple string response.
 */
export const OutputSchema = z.object({
  response: z.string(),
});

/**
 * Config schema for the external step.
 * Defines config properties that appear at the step level (outside the `with` block).
 * Example: `proxy.id` or `proxy.url`.
 */
export const ConfigSchema = z.object({
  proxy: z.object({
    id: z.string(),
    url: z.string().optional(),
  }),
});

export type ExternalStepInputSchema = typeof InputSchema;
export type ExternalStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for External step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const externalStepCommonDefinition: CommonStepDefinition<
  ExternalStepInputSchema,
  ExternalStepOutputSchema,
  typeof ConfigSchema
> = {
  id: ExternalStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
