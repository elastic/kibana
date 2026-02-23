/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LegacyWorkflowInput, WorkflowOutput } from '@kbn/workflows';
import { buildZodSchemaFromFields } from '@kbn/workflows';

// Union type for fields that can be inputs or outputs
type WorkflowField = LegacyWorkflowInput | WorkflowOutput;

// Generic interface for validation errors
export interface WorkflowFieldValidationError {
  fieldName: string;
  message: string;
}

/**
 * Creates a Zod validator for workflow fields (inputs or outputs).
 * Uses shared buildZodSchemaFromFields from @kbn/workflows.
 */
export function makeWorkflowFieldsValidator(fields: WorkflowField[]) {
  return buildZodSchemaFromFields(fields, { optionalIfNotRequired: true });
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
      message = message.replace(/^Invalid input:\s*/, '');

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
