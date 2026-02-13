/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import type { z } from '@kbn/zod/v4';
import type { LegacyWorkflowInput, WorkflowInputSchema } from '../schema';
import type { JsonModelSchemaType } from '../schema/common/json_model_schema';

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
): JsonModelSchemaType {
  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const input of legacyInputs) {
    // Skip null/undefined inputs (can happen during partial YAML parsing)
    if (input && typeof input === 'object' && input.name) {
      properties[input.name] = convertLegacyInputToJsonSchemaProperty(input);

      if (input.required === true) {
        required.push(input.name);
      }
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
  inputs?: JsonModelSchemaType | Array<z.infer<typeof WorkflowInputSchema>>
): JsonModelSchemaType | undefined {
  if (!inputs) {
    return undefined;
  }

  // If it's already in the new format (has properties), return as-is
  // Check typeof first to avoid 'in' operator error on primitives (e.g., when YAML is partially parsed)
  if (
    typeof inputs === 'object' &&
    inputs !== null &&
    !Array.isArray(inputs) &&
    'properties' in inputs
  ) {
    const inputsWithProperties = inputs as { properties?: unknown };
    if (
      typeof inputsWithProperties.properties === 'object' &&
      inputsWithProperties.properties !== null &&
      !Array.isArray(inputsWithProperties.properties)
    ) {
      return inputs as JsonModelSchemaType;
    }
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
function applyDefaultToObjectProperty(
  prop: JSONSchema7,
  currentValue: unknown,
  inputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
): unknown {
  if (currentValue === undefined) {
    if (prop.default !== undefined) {
      return prop.default;
    }
    if (prop.type === 'object' && prop.properties) {
      return applyDefaultFromSchema(prop, undefined, inputsSchema);
    }
    return undefined;
  }

  if (
    prop.type === 'object' &&
    prop.properties &&
    typeof currentValue === 'object' &&
    !Array.isArray(currentValue)
  ) {
    return applyDefaultFromSchema(prop, currentValue, inputsSchema);
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
  value: Record<string, unknown>,
  inputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const prop = propSchema as JSONSchema7;
    const currentValue = result[key];
    const defaultValue = applyDefaultToObjectProperty(prop, currentValue, inputsSchema);
    if (defaultValue !== undefined) {
      result[key] = defaultValue;
    }
  }
  return result;
}

/**
 * Recursively checks if a schema has any defaults (direct or nested)
 */
function hasDefaultsRecursive(
  schema: JSONSchema7,
  inputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
): boolean {
  // Resolve $ref if present
  if (schema.$ref && inputsSchema) {
    const resolvedSchema = resolveRef(schema.$ref, inputsSchema);
    if (resolvedSchema) {
      return hasDefaultsRecursive(resolvedSchema, inputsSchema);
    }
  }

  // Direct default
  if (schema.default !== undefined) {
    return true;
  }

  // Check nested properties for defaults
  if (schema.type === 'object' && schema.properties) {
    for (const propSchema of Object.values(schema.properties)) {
      const prop = propSchema as JSONSchema7;
      if (hasDefaultsRecursive(prop, inputsSchema)) {
        return true;
      }
    }
  }

  // Check array items for defaults
  if (schema.type === 'array' && schema.items) {
    const itemsSchema = schema.items as JSONSchema7;
    return hasDefaultsRecursive(itemsSchema, inputsSchema);
  }

  return false;
}

function createObjectWithDefaults(
  schema: JSONSchema7,
  inputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(schema.properties || {})) {
    const prop = propSchema as JSONSchema7;
    const isRequired = schema.required?.includes(key) ?? false;

    // Include property if:
    // 1. It's required, OR
    // 2. It has defaults (direct or nested)
    if (isRequired || hasDefaultsRecursive(prop, inputsSchema)) {
      const defaultValue = applyDefaultFromSchema(prop, undefined, inputsSchema);
      if (defaultValue !== undefined) {
        result[key] = defaultValue;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Resolves a $ref reference within the inputs schema context
 * @param ref - The $ref string (e.g., "#/definitions/UserSchema")
 * @param inputsSchema - The full inputs schema containing definitions
 * @returns The resolved schema, or null if not found
 */
export function resolveRef(
  ref: string,
  inputsSchema: ReturnType<typeof normalizeInputsToJsonSchema>
): JSONSchema7 | null {
  if (!ref.startsWith('#/')) {
    // External references not supported yet
    return null;
  }

  const path = ref.slice(2).split('/'); // Remove '#/' and split
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = inputsSchema;

  for (const segment of path) {
    if (current && typeof current === 'object') {
      current = current[segment];
    } else {
      return null;
    }
  }

  return current as JSONSchema7 | null;
}

/**
 * Recursively applies default values from JSON Schema to input values
 * @param schema - The JSON Schema property definition
 * @param value - The current input value (may be undefined)
 * @param inputsSchema - The full inputs schema (for resolving $ref)
 * @returns The value with defaults applied
 */
function applyDefaultFromSchema(
  schema: JSONSchema7,
  value: unknown,
  inputsSchema?: ReturnType<typeof normalizeInputsToJsonSchema>
): unknown {
  // Resolve $ref if present
  if (schema.$ref && inputsSchema) {
    const resolvedSchema = resolveRef(schema.$ref, inputsSchema);
    if (resolvedSchema) {
      // Use resolved schema for applying defaults
      return applyDefaultFromSchema(resolvedSchema, value, inputsSchema);
    }
  }
  // If value is already provided, use it (unless it's undefined/null for objects)
  if (value !== undefined && value !== null) {
    // For objects, recursively apply defaults to nested properties
    if (
      schema.type === 'object' &&
      schema.properties &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return applyDefaultsToObjectProperties(
        schema,
        value as Record<string, unknown>,
        inputsSchema
      );
    }
    return value;
  }

  // If value is not provided, use default if available
  if (schema.default !== undefined) {
    return schema.default;
  }

  // For objects, create object with defaults for required properties or properties with defaults
  if (schema.type === 'object' && schema.properties) {
    const objectWithDefaults = createObjectWithDefaults(schema, inputsSchema);
    // If we created an object with defaults, return it; otherwise return undefined
    // This ensures nested objects with defaults are created even if not required
    return objectWithDefaults;
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
  let hasAnyDefaults = false;

  for (const [propertyName, propertySchema] of Object.entries(inputsSchema.properties)) {
    const jsonSchema = propertySchema as JSONSchema7;
    const currentValue = result[propertyName];

    // Apply defaults if value is missing or undefined
    if (currentValue === undefined) {
      const defaultValue = applyDefaultFromSchema(jsonSchema, undefined, inputsSchema);
      if (defaultValue !== undefined) {
        result[propertyName] = defaultValue;
        hasAnyDefaults = true;
      }
    } else if (
      jsonSchema.type === 'object' &&
      jsonSchema.properties &&
      typeof currentValue === 'object' &&
      !Array.isArray(currentValue)
    ) {
      // Recursively apply defaults to nested objects
      const updatedValue = applyDefaultFromSchema(jsonSchema, currentValue, inputsSchema);
      if (updatedValue !== undefined) {
        result[propertyName] = updatedValue;
        hasAnyDefaults = true;
      }
    } else if (jsonSchema.$ref) {
      // Handle $ref: resolve and apply defaults
      const defaultValue = applyDefaultFromSchema(jsonSchema, currentValue, inputsSchema);
      if (defaultValue !== undefined) {
        result[propertyName] = defaultValue;
        hasAnyDefaults = true;
      }
    }
  }

  // Return undefined if no defaults were applied and inputs was undefined
  // This allows the caller to distinguish between "no defaults" and "empty object with defaults"
  if (!hasAnyDefaults && inputs === undefined && Object.keys(result).length === 0) {
    return undefined;
  }

  return result;
}
