/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowOutput } from '@kbn/workflows';
import { makeWorkflowFieldsValidator, validateWorkflowFields } from './validate_workflow_fields';

/**
 * Creates a Zod validator for workflow outputs
 * Delegates to shared field validator
 */
export function makeWorkflowOutputsValidator(outputs: WorkflowOutput[]) {
  return makeWorkflowFieldsValidator(outputs);
}

export interface WorkflowOutputValidationError {
  outputName: string;
  message: string;
}

/**
 * Validates workflow outputs against the workflow's output schema
 * Returns validation errors if any
 */
export function validateWorkflowOutputs(
  outputs: Record<string, unknown> | undefined,
  targetWorkflowOutputs: WorkflowOutput[] | undefined
): { isValid: boolean; errors: WorkflowOutputValidationError[] } {
  const result = validateWorkflowFields(outputs, targetWorkflowOutputs, 'output');

  // Map generic field errors to output-specific errors
  return {
    isValid: result.isValid,
    errors: result.errors.map((error) => ({
      outputName: error.fieldName,
      message: error.message,
    })),
  };
}
