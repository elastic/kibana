/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/**
 * Common step definition fields shared between server and public.
 * Input and output types are automatically inferred from the schemas.
 */
export interface CommonStepDefinition<
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType
> {
  /**
   * Unique identifier for this step type.
   * Should follow a namespaced format (e.g., "custom.myStep", "plugin.feature.step").
   */
  id: string;

  /**
   * Zod schema for validating step input.
   * Defines the structure and validation rules for the step's input parameters.
   * The input type is automatically inferred from this schema.
   */
  inputSchema: TInputSchema;

  /**
   * Zod schema for validating step output.
   * Defines the structure and validation rules for the step's output.
   * The output type is automatically inferred from this schema.
   */
  outputSchema: TOutputSchema;
}

/**
 * Helper type to infer input type from a CommonStepDefinition's inputSchema
 */
export type InferStepInput<T extends CommonStepDefinition> = T extends CommonStepDefinition<
  infer TInputSchema,
  z.ZodType
>
  ? z.infer<TInputSchema>
  : unknown;

/**
 * Helper type to infer output type from a CommonStepDefinition's outputSchema
 */
export type InferStepOutput<T extends CommonStepDefinition> = T extends CommonStepDefinition<
  z.ZodType,
  infer TOutputSchema
>
  ? z.infer<TOutputSchema>
  : unknown;
