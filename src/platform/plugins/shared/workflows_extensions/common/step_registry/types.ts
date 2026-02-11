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
  InputSchema extends z.ZodType = z.ZodType,
  OutputSchema extends z.ZodType = z.ZodType,
  ConfigSchema extends z.ZodObject = z.ZodObject
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
  inputSchema: InputSchema;

  /**
   * Zod schema for validating step output.
   * Defines the structure and validation rules for the step's output.
   * The output type is automatically inferred from this schema.
   */
  outputSchema: OutputSchema;

  /**
   * Zod schema for validating step config properties.
   * Defines config properties that appear at the step level (outside the `with` block).
   * Example: `agent-id` for agent.call step.
   */
  configSchema?: ConfigSchema;
}
