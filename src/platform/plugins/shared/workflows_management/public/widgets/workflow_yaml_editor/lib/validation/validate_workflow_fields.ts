/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import {
  type NormalizableFieldSchema,
  normalizeFieldsToJsonSchema,
} from '@kbn/workflows/spec/lib/field_conversion';
import { z } from '@kbn/zod/v4';

// Generic interface for validation errors
export interface WorkflowFieldValidationError {
  fieldName: string;
  message: string;
}

/**
 * Creates a Zod validator for workflow fields (inputs or outputs).
 * Supports both legacy array format and JSON Schema format.
 */
export function makeWorkflowFieldsValidator(fields: NormalizableFieldSchema) {
  const normalized = normalizeFieldsToJsonSchema(fields);
  if (normalized?.properties && Object.keys(normalized.properties).length > 0) {
    return buildFieldsZodValidator(normalized);
  }
  return z.object({}) as z.ZodObject<Record<string, z.ZodType>>;
}

/**
 * Validates workflow fields (inputs or outputs) against the target schema
 * Returns validation errors if any
 *
 * @param fieldKind - 'input' or 'output' for error messages
 */
export function validateWorkflowFields(
  values: Record<string, unknown> | undefined,
  targetFields: NormalizableFieldSchema | undefined,
  fieldKind: 'input' | 'output'
): { isValid: boolean; errors: WorkflowFieldValidationError[] } {
  const fieldKindPlural = fieldKind === 'input' ? 'inputs' : 'outputs';

  if (!targetFields) {
    return { isValid: true, errors: [] };
  }

  const normalized = normalizeFieldsToJsonSchema(targetFields);
  if (!normalized?.properties || Object.keys(normalized.properties).length === 0) {
    return { isValid: true, errors: [] };
  }

  if (!values) {
    const requiredFields = normalized.required || [];
    if (requiredFields.length > 0) {
      return {
        isValid: false,
        errors: [
          {
            fieldName: '',
            message: `Missing required ${fieldKindPlural}: ${requiredFields.join(', ')}`,
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

      const fieldSchema = normalized.properties?.[fieldName];
      const isRequired = normalized.required?.includes(fieldName) ?? false;
      const fieldType =
        fieldSchema && typeof fieldSchema === 'object' && 'type' in fieldSchema
          ? (fieldSchema as { type?: string }).type
          : undefined;

      if (issue.code === 'invalid_type' && message.includes('received undefined') && isRequired) {
        message = 'this field is required';
      } else if (issue.code === 'invalid_union') {
        if (fieldType === 'array' && values) {
          const receivedValue = values[fieldName];
          if (receivedValue !== undefined) {
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
