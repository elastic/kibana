/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';

/**
 * Step type identifier. Used to uniquely identify a workflow step type.
 * Should follow a namespaced format (e.g., "custom.myStep", "plugin.feature.step").
 */
export type StepTypeId = string & { readonly __brand: 'StepTypeId' };

/**
 * Creates a branded step type ID from a string.
 * @param id - The step type identifier string
 * @returns A branded StepTypeId
 */
export function createStepTypeId(id: string): StepTypeId {
  return id as StepTypeId;
}

/**
 * Common step definition fields shared between server and public.
 */
export interface CommonStepDefinition {
  /**
   * Unique identifier for this step type.
   * Should follow a namespaced format (e.g., "custom.myStep", "plugin.feature.step").
   */
  id: StepTypeId;

  /**
   * Zod schema for validating step input.
   * Defines the structure and validation rules for the step's input parameters.
   */
  inputSchema: z.ZodTypeAny;

  /**
   * Zod schema for validating step output.
   * Defines the structure and validation rules for the step's output.
   */
  outputSchema: z.ZodTypeAny;
}
