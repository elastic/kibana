/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowInput, WorkflowOutput } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

// Union type for fields that can be inputs or outputs
type WorkflowField = WorkflowInput | WorkflowOutput;

// Generic interface for validation errors
export interface WorkflowFieldValidationError {
  fieldName: string;
  message: string;
}

/**
 * Creates a Zod validator for workflow fields (inputs or outputs)
 * This function is shared between input and output validation
 */
export function makeWorkflowFieldsValidator(fields: WorkflowField[]) {
  return z.object(
    fields.reduce((acc, field) => {
      switch (field.type) {
        case 'string':
          acc[field.name] = field.required ? z.string() : z.string().optional();
          break;
        case 'number':
          acc[field.name] = field.required ? z.number() : z.number().optional();
          break;
        case 'boolean':
          acc[field.name] = field.required ? z.boolean() : z.boolean().optional();
          break;
        case 'choice':
          acc[field.name] = field.required
            ? z.enum(field.options as [string, ...string[]])
            : z.enum(field.options as [string, ...string[]]).optional();
          break;
        case 'array': {
          const arraySchemas = [z.array(z.string()), z.array(z.number()), z.array(z.boolean())];
          const { minItems, maxItems } = field as WorkflowField & {
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
          acc[field.name] = field.required ? arr : arr.optional();
          break;
        }
      }
      return acc;
    }, {} as Record<string, z.ZodType>)
  );
}

/**
 * Validates workflow fields (inputs or outputs) against the target schema
 * Returns validation errors if any
 *
 * @param fieldKind - 'input' or 'output' for error messages
 */
export function validateWorkflowFields(
  values: Record<string, unknown> | undefined,
  targetFields: WorkflowField[] | undefined,
  fieldKind: 'input' | 'output'
): { isValid: boolean; errors: WorkflowFieldValidationError[] } {
  const fieldKindPlural = fieldKind === 'input' ? 'inputs' : 'outputs';

  if (!targetFields || targetFields.length === 0) {
    // No fields required, so any values (or none) are valid
    return { isValid: true, errors: [] };
  }

  if (!values) {
    // Check if any fields are required
    const requiredFields = targetFields.filter((field) => field.required);
    if (requiredFields.length > 0) {
      return {
        isValid: false,
        errors: [
          {
            fieldName: '',
            message: `Missing required ${fieldKindPlural}: ${requiredFields
              .map((f) => f.name)
              .join(', ')}`,
          },
        ],
      };
    }
    return { isValid: true, errors: [] };
  }

  const validator = makeWorkflowFieldsValidator(targetFields);
  const result = validator.safeParse(values);

  if (!result.success) {
    const errors: WorkflowFieldValidationError[] = result.error.issues.map((issue) => {
      const fieldName = (issue.path[0] as string) || '';
      let message = issue.message;

      // Remove "Invalid input: " prefix if present (Zod's default prefix)
      message = message.replace(/^Invalid input:\s*/i, '');

      const fieldDef = targetFields.find((f) => f.name === fieldName);

      if (
        issue.code === 'invalid_type' &&
        message.includes('received undefined') &&
        fieldDef?.required
      ) {
        message = 'this field is required';
      } else if (issue.code === 'invalid_union') {
        if (fieldDef?.type === 'array' && values) {
          const receivedValue = values[fieldName];
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

      return { fieldName, message };
    });
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}
