/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import $RefParser from '@apidevtools/json-schema-ref-parser';
import type { JSONSchema7 } from 'json-schema';
import type { z } from '@kbn/zod/v4';
import type { JsonModelSchemaType, LegacyWorkflowInput, WorkflowInputSchema } from '../schema';

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
 * Manually fetches and inlines remote $ref references using fetch (for browser compatibility).
 * json-schema-ref-parser uses Node.js http module which doesn't work in browsers.
 * This function recursively finds remote refs, fetches them, and inlines them into the schema.
 */
async function resolveRemoteRefsInBrowser(schema: JSONSchema7): Promise<JSONSchema7> {
  const fetchedSchemas = new Map<string, JSONSchema7>();

  // Find all unique remote URLs
  function findRemoteUrls(obj: unknown, urls: Set<string>): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => findRemoteUrls(item, urls));
      return;
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && value.startsWith('http')) {
        // Found a remote reference
        const url = value.split('#')[0]; // Get URL without fragment
        urls.add(url);
      } else if (typeof value === 'object' && value !== null) {
        findRemoteUrls(value, urls);
      }
    }
  }

  const remoteUrls = new Set<string>();
  findRemoteUrls(schema, remoteUrls);

  // Fetch all remote schemas
  for (const url of remoteUrls) {
    // Use fetch if available (Node.js 18+ and browsers)
    let data: JSONSchema7;

    if (typeof fetch !== 'undefined') {
      // Use native fetch (Node.js 18+ or browser)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      data = (await response.json()) as JSONSchema7;
      fetchedSchemas.set(url, data);
    } else {
      // If fetch is not available, skip this URL
      // This should not happen in modern Node.js or browsers
      throw new Error(`fetch is not available, cannot fetch ${url}`);
    }
  }

  // Recursively replace remote $ref with fetched schema content
  function inlineRemoteRefs(obj: unknown): unknown {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => inlineRemoteRefs(item));
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('http')) {
        // This is a remote reference - resolve it
        const [url, fragment] = value.split('#');
        const fetchedSchema = fetchedSchemas.get(url);

        if (!fetchedSchema) {
          // If we couldn't fetch it, keep the original ref
          result[key] = value;
        } else if (fragment) {
          // If there's a fragment (JSON Pointer), resolve it
          const path = fragment.substring(1).split('/'); // Remove leading # and split
          let resolved: unknown = fetchedSchema;

          for (const segment of path) {
            if (segment && typeof resolved === 'object' && resolved !== null) {
              resolved = (resolved as Record<string, unknown>)[segment];
            } else {
              resolved = undefined;
              break;
            }
          }

          if (resolved !== undefined) {
            // Inline the resolved schema (may contain nested refs)
            return inlineRemoteRefs(resolved);
          }
        } else {
          // No fragment, use the entire fetched schema
          return inlineRemoteRefs(fetchedSchema);
        }
      } else {
        result[key] = inlineRemoteRefs(value);
      }
    }

    return result;
  }

  return inlineRemoteRefs(schema) as JSONSchema7;
}

// Helper functions for checking schema references
function hasRefs(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => hasRefs(item));
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      return true;
    }
    if (hasRefs(value)) {
      return true;
    }
  }
  return false;
}

function hasRemoteRefs(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => hasRemoteRefs(item));
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('http')) {
      return true;
    }
    if (hasRemoteRefs(value)) {
      return true;
    }
  }
  return false;
}

function hasRefsAfterRemoteResolution(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => hasRefsAfterRemoteResolution(item));
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      return true;
    }
    if (hasRefsAfterRemoteResolution(value)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves all $ref references (local and remote) in a JSON Schema.
 * Uses @apidevtools/json-schema-ref-parser to dereference all references.
 * Manually resolves remote refs first using fetch (works in both browser and Node.js 18+),
 * then uses json-schema-ref-parser for local refs only.
 * @param schema - The JSON Schema with potential $ref references
 * @returns Fully dereferenced schema with all references inlined
 */
export async function resolveAllReferences(schema: JSONSchema7): Promise<JSONSchema7> {
  // Early return for null/undefined or empty schemas
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  try {
    // If no refs at all, return schema as-is (no processing needed)
    // Deep clone to ensure we don't return a reference that could be mutated
    if (!hasRefs(schema)) {
      return JSON.parse(JSON.stringify(schema)) as JSONSchema7;
    }

    // Only resolve remote refs if they exist
    let schemaWithRemoteRefsResolved = schema;
    if (hasRemoteRefs(schema)) {
      schemaWithRemoteRefsResolved = await resolveRemoteRefsInBrowser(schema);
    }

    if (!hasRefsAfterRemoteResolution(schemaWithRemoteRefsResolved)) {
      // Deep clone to ensure $RefParser doesn't modify the original
      return JSON.parse(JSON.stringify(schemaWithRemoteRefsResolved)) as JSONSchema7;
    }

    // Only call $RefParser if there are local refs to resolve
    const dereferenced = await $RefParser.dereference(schemaWithRemoteRefsResolved, {
      resolve: {
        http: false, // Already resolved manually (or no remote refs)
        file: false, // Disable file system access for security
      },
    });
    return dereferenced as JSONSchema7;
  } catch (error) {
    // If resolution fails, return original schema
    // This allows workflows with invalid remote refs to still work with local refs
    return schema;
  }
}

/**
 * Normalizes workflow inputs to the new JSON Schema object format.
 * If inputs are already in the new format, returns them as-is.
 * If inputs are in the legacy array format, converts them.
 * Note: This is synchronous and does NOT resolve remote references.
 * Use normalizeInputsToJsonSchemaAsync() if you need remote reference resolution.
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
 * Normalizes workflow inputs to the new JSON Schema object format and resolves all references (local and remote).
 * If inputs are already in the new format, resolves references and returns.
 * If inputs are in the legacy array format, converts them first, then resolves references.
 * @param inputs - The inputs to normalize (can be array or JSON Schema object)
 * @returns The inputs in the new JSON Schema object format with all references resolved, or undefined if no inputs
 */
export async function normalizeInputsToJsonSchemaAsync(
  inputs?: JsonModelSchemaType | Array<z.infer<typeof WorkflowInputSchema>>
): Promise<JsonModelSchemaType | undefined> {
  const normalized = normalizeInputsToJsonSchema(inputs);
  if (!normalized) {
    return undefined;
  }

  // Resolve all $ref references (local and remote) before returning
  // This will return the schema as-is if there are no refs (early return in resolveAllReferences)
  try {
    const resolved = await resolveAllReferences(normalized);
    return resolved as JsonModelSchemaType;
  } catch (error) {
    // If resolution fails, return the normalized schema (without refs resolved)
    // This ensures workflows still work even if ref resolution fails
    return normalized;
  }
}

/**
 * Applies defaults to a nested object property
 * @param prop - The property schema
 * @param currentValue - The current value for this property
 * @param inputsSchema - The full inputs schema (for resolving $ref - should already be resolved)
 * @returns The value with defaults applied
 */
function applyDefaultToObjectProperty(
  prop: JSONSchema7,
  currentValue: unknown,
  inputsSchema?: JsonModelSchemaType
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
 * @param inputsSchema - The full inputs schema (for resolving $ref - should already be resolved)
 * @returns The object with defaults applied
 */
function applyDefaultsToObjectProperties(
  schema: JSONSchema7,
  value: Record<string, unknown>,
  inputsSchema?: JsonModelSchemaType
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
 * Note: After pre-resolution, $ref should be rare, but kept for backward compatibility
 */
function hasDefaultsRecursive(schema: JSONSchema7, inputsSchema?: JsonModelSchemaType): boolean {
  // Resolve $ref if present (should be rare after pre-resolution)
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
  inputsSchema?: JsonModelSchemaType
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
 * Resolves a $ref reference within the inputs schema context.
 * Note: After pre-resolution via resolveAllReferences(), most schemas won't have $ref anymore.
 * This function is kept for backward compatibility and edge cases.
 * @param ref - The $ref string (e.g., "#/definitions/UserSchema")
 * @param inputsSchema - The full inputs schema containing definitions
 * @returns The resolved schema, or null if not found
 */
export function resolveRef(
  ref: string,
  inputsSchema: JsonModelSchemaType | undefined
): JSONSchema7 | null {
  if (!inputsSchema || !ref.startsWith('#/')) {
    // External references should be resolved by resolveAllReferences()
    // Local references starting with #/ are handled below
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
 * Recursively applies default values from JSON Schema to input values.
 * Note: After pre-resolution, $ref should be rare, but kept for backward compatibility.
 * @param schema - The JSON Schema property definition (should already be resolved)
 * @param value - The current input value (may be undefined)
 * @param inputsSchema - The full inputs schema (for resolving $ref if needed)
 * @returns The value with defaults applied
 */
function applyDefaultFromSchema(
  schema: JSONSchema7,
  value: unknown,
  inputsSchema?: JsonModelSchemaType
): unknown {
  // Resolve $ref if present (should be rare after pre-resolution)
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
 * Applies default values from JSON Schema to workflow inputs.
 * The inputsSchema should already have all $ref references resolved via normalizeInputsToJsonSchema().
 * @param inputs - The actual input values provided (may be partial or undefined)
 * @param inputsSchema - The normalized JSON Schema inputs definition (with all refs resolved)
 * @returns The inputs with defaults applied
 */
export function applyInputDefaults(
  inputs: Record<string, unknown> | undefined,
  inputsSchema: JsonModelSchemaType | undefined
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
      // Handle $ref: resolve and apply defaults (should be rare after pre-resolution)
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
