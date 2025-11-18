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

/**
 * Applies defaults to a nested object property
 * @param prop - The property schema
 * @param currentValue - The current value for this property
 * @returns The value with defaults applied
 */
function applyDefaultToObjectProperty(prop: JSONSchema7, currentValue: unknown): unknown {
  if (currentValue === undefined) {
    if (prop.default !== undefined) {
      return prop.default;
    }
    if (prop.type === 'object' && prop.properties) {
      return applyDefaultFromSchema(prop, undefined);
    }
    return undefined;
  }

  if (
    prop.type === 'object' &&
    prop.properties &&
    typeof currentValue === 'object' &&
    !Array.isArray(currentValue)
  ) {
    return applyDefaultFromSchema(prop, currentValue);
  }

  return currentValue;
}

/**
 * Applies defaults to all properties of an object
 * @param schema - The object schema
 * @param value - The current object value
 * @returns The object with defaults applied
 */
function applyDefaultsToObjectProperties(
  schema: JSONSchema7,
  value: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const prop = propSchema as JSONSchema7;
    const currentValue = result[key];
    const defaultValue = applyDefaultToObjectProperty(prop, currentValue);
    if (defaultValue !== undefined) {
      result[key] = defaultValue;
    }
  }
  return result;
}

/**
 * Creates an object with defaults for required properties
 * @param schema - The object schema
 * @returns An object with defaults applied, or undefined if no defaults
 */
function createObjectWithDefaults(schema: JSONSchema7): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const prop = propSchema as JSONSchema7;
    const isRequired = schema.required?.includes(key) ?? false;
    if (isRequired || prop.default !== undefined) {
      const defaultValue = applyDefaultFromSchema(prop, undefined);
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Recursively applies default values from JSON Schema to input values
 * @param schema - The JSON Schema property definition
 * @param value - The current input value (may be undefined)
 * @returns The value with defaults applied
 */
function applyDefaultFromSchema(schema: JSONSchema7, value: unknown): unknown {
  // If value is already provided, use it (unless it's undefined/null for objects)
  if (value !== undefined && value !== null) {
    // For objects, recursively apply defaults to nested properties
    if (
      schema.type === 'object' &&
      schema.properties &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return applyDefaultsToObjectProperties(schema, value as Record<string, unknown>);
    }
    return value;
  }

  // If value is not provided, use default if available
  if (schema.default !== undefined) {
    return schema.default;
  }

  // For objects, create object with defaults for required properties
  if (schema.type === 'object' && schema.properties) {
    return createObjectWithDefaults(schema);
  }

  // For arrays, return empty array if no default
  if (schema.type === 'array') {
    return schema.default ?? [];
  }

  return undefined;
}

/**
 * Applies default values from JSON Schema to workflow inputs
 * @param inputs - The actual input values provided (may be partial or undefined)
 * @param inputsSchema - The normalized JSON Schema inputs definition
 * @returns The inputs with defaults applied
 */
export function applyInputDefaults(
  inputs: Record<string, unknown> | undefined,
  inputsSchema: ReturnType<typeof normalizeInputsToJsonSchema>
): Record<string, unknown> | undefined {
  if (!inputsSchema?.properties) {
    return inputs;
  }

  const result: Record<string, unknown> = { ...(inputs || {}) };

  for (const [propertyName, propertySchema] of Object.entries(inputsSchema.properties)) {
    const jsonSchema = propertySchema as JSONSchema7;
    const currentValue = result[propertyName];

    // Apply defaults if value is missing or undefined
    if (currentValue === undefined) {
      const defaultValue = applyDefaultFromSchema(jsonSchema, undefined);
      if (defaultValue !== undefined) {
        result[propertyName] = defaultValue;
      }
    } else if (
      jsonSchema.type === 'object' &&
      jsonSchema.properties &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      // Recursively apply defaults to nested objects
      result[propertyName] = applyDefaultFromSchema(jsonSchema, currentValue);
    }
  }

  return result;
}
