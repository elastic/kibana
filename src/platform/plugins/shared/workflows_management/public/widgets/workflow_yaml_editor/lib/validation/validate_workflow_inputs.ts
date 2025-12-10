/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput, WorkflowInputChoice } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

/**
 * Creates a Zod validator for workflow inputs
 * Reuses the same logic from workflow_execute_manual_form
 */
export function makeWorkflowInputsValidator(inputs: WorkflowInput[]) {
  return z.object(
    inputs.reduce((acc, input) => {
      switch (input.type) {
        case 'string':
          acc[input.name] = input.required ? z.string() : z.string().optional();
          break;
        case 'number':
          acc[input.name] = input.required ? z.number() : z.number().optional();
          break;
        case 'boolean':
          acc[input.name] = input.required ? z.boolean() : z.boolean().optional();
          break;
        case 'choice':
          acc[input.name] = input.required
            ? z.enum((input as WorkflowInputChoice).options as [string, ...string[]])
            : z.enum((input as WorkflowInputChoice).options as [string, ...string[]]).optional();
          break;
        case 'array': {
          const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
          const { minItems, maxItems } = input as WorkflowInput & {
            minItems?: number;
            maxItems?: number;
          };
          const applyConstraints = (
            schema: z.ZodArray<z.ZodString | z.ZodNumber | z.ZodBoolean>
          ) => {
            let s = schema;
            if (minItems != null) s = s.min(minItems);
            if (maxItems != null) s = s.max(maxItems);
            return s;
          };
          const arr = z.union(
            arraySchemas.map(applyConstraints) as [
              z.ZodArray<z.ZodString>,
              z.ZodArray<z.ZodNumber>,
              z.ZodArray<z.ZodBoolean>
            ]
          );
          acc[input.name] = input.required ? arr : arr.optional();
          break;
        }
      }
      return acc;
    }, {} as Record<string, z.ZodType>)
  );
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
  if (!targetWorkflowInputs || targetWorkflowInputs.length === 0) {
    // No inputs required, so any inputs (or none) are valid
    return { isValid: true, errors: [] };
  }

  if (!inputs) {
    // Check if any inputs are required
    const requiredInputs = targetWorkflowInputs.filter((input) => input.required);
    if (requiredInputs.length > 0) {
      return {
        isValid: false,
        errors: [
          {
            inputName: '',
            message: `Missing required inputs: ${requiredInputs.map((i) => i.name).join(', ')}`,
          },
        ],
      };
    }
    return { isValid: true, errors: [] };
  }

  const validator = makeWorkflowInputsValidator(targetWorkflowInputs);
  const result = validator.safeParse(inputs);

  if (!result.success) {
    const errors: WorkflowInputValidationError[] = result.error.issues.map((issue) => {
      const inputName = (issue.path[0] as string) || '';
      let message = issue.message;

      // Remove "Invalid input: " prefix if present (Zod's default prefix)
      message = message.replace(/^Invalid input:\s*/i, '');

      // Enhance union errors for array types with more descriptive messages
      if (issue.code === 'invalid_union') {
        // Check if this is an array input that received a non-array value
        const inputDef = targetWorkflowInputs.find((inp) => inp.name === inputName);
        if (inputDef?.type === 'array' && inputs) {
          const receivedValue = inputs[inputName];
          if (receivedValue !== undefined) {
            // Determine the actual type of the received value
            const receivedType =
              receivedValue === null
                ? 'null'
                : Array.isArray(receivedValue)
                ? 'array'
                : typeof receivedValue;
            message = `expected array, received ${receivedType}`;
          } else {
            message = 'expected array';
          }
        }
      }

      return { inputName, message };
    });
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}
