/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { z } from '@kbn/zod';
import type {
  WorkflowInputArraySchema,
  WorkflowInputBooleanSchema,
  WorkflowInputChoiceSchema,
  WorkflowInputNumberSchema,
  WorkflowInputSchema,
  WorkflowInputsJsonSchema,
  WorkflowInputStringSchema,
} from '../schema';

type LegacyWorkflowInput =
  | z.infer<typeof WorkflowInputStringSchema>
  | z.infer<typeof WorkflowInputNumberSchema>
  | z.infer<typeof WorkflowInputBooleanSchema>
  | z.infer<typeof WorkflowInputChoiceSchema>
  | z.infer<typeof WorkflowInputArraySchema>;

type WorkflowInputsJsonSchemaType = z.infer<typeof WorkflowInputsJsonSchema>;

/**
 * Converts a legacy workflow input definition to a JSON Schema property
 * @param input - The legacy input to convert
 * @returns A JSON Schema property definition
 */
function convertLegacyInputToJsonSchemaProperty(input: LegacyWorkflowInput): JSONSchema7 {
  const property: JSONSchema7 = {
    type: input.type === 'choice' ? 'string' : input.type,
  };

  if (input.description) {
    property.description = input.description;
  }

  if (input.default !== undefined) {
    property.default = input.default;
  }

  switch (input.type) {
    case 'choice':
      property.enum = input.options;
      break;
    case 'array': {
      property.items = {
        anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
      };
      if (input.minItems !== undefined) {
        property.minItems = input.minItems;
      }
      if (input.maxItems !== undefined) {
        property.maxItems = input.maxItems;
      }
      break;
    }
    default:
      // string, number, boolean - already handled
      break;
  }

  return property;
}

/**
 * Converts legacy array-based inputs format to the new JSON Schema object format
 * @param legacyInputs - Array of legacy input definitions
 * @returns The inputs in the new JSON Schema object format
 */
export function convertLegacyInputsToJsonSchema(
  legacyInputs: Array<z.infer<typeof WorkflowInputSchema>>
): WorkflowInputsJsonSchemaType {
  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const input of legacyInputs) {
    // Convert the input to a JSON Schema property
    const property = convertLegacyInputToJsonSchemaProperty(input as LegacyWorkflowInput);

    // Add to properties using the input name as the key
    properties[input.name] = property;

    // If the input is required, add to required array
    if (input.required === true) {
      required.push(input.name);
    }
  }

  return {
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: false,
  };
}

/**
 * Normalizes workflow inputs to the new JSON Schema object format
 * If inputs are already in the new format, returns them as-is
 * If inputs are in the legacy array format, converts them
 * @param inputs - The inputs to normalize (can be array or JSON Schema object)
 * @returns The inputs in the new JSON Schema object format, or undefined if no inputs
 */
export function normalizeInputsToJsonSchema(
  inputs?: WorkflowInputsJsonSchemaType | Array<z.infer<typeof WorkflowInputSchema>>
): WorkflowInputsJsonSchemaType | undefined {
  if (!inputs) {
    return undefined;
  }

  // If it's already in the new format (has properties), return as-is
  if ('properties' in inputs && typeof inputs === 'object' && inputs !== null) {
    return inputs as WorkflowInputsJsonSchemaType;
  }

  // If it's an array, convert it
  if (Array.isArray(inputs)) {
    return convertLegacyInputsToJsonSchema(inputs);
  }

  // Fallback: return undefined
  return undefined;
}
