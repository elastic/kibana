/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput } from '@kbn/workflows';
import { makeWorkflowFieldsValidator, validateWorkflowFields } from './validate_workflow_fields';

/**
 * Creates a Zod validator for workflow inputs
 * Delegates to shared field validator
 */
export function makeWorkflowInputsValidator(inputs: WorkflowInput[]) {
  return makeWorkflowFieldsValidator(inputs);
}

export interface WorkflowInputValidationError {
  inputName: string;
  message: string;
}

/**
 * Validates workflow inputs against the target workflow's input schema
 * Returns validation errors if any
 */
export function validateWorkflowInputs(
  inputs: Record<string, unknown> | undefined,
  targetWorkflowInputs: WorkflowInput[] | undefined
): { isValid: boolean; errors: WorkflowInputValidationError[] } {
  const result = validateWorkflowFields(inputs, targetWorkflowInputs, 'input');

  // Map generic field errors to input-specific errors
  return {
    isValid: result.isValid,
    errors: result.errors.map((error) => ({
      inputName: error.fieldName,
      message: error.message,
    })),
  };
}
