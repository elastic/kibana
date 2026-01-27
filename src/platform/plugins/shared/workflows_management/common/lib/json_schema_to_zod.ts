/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';

/**
 * Recursively converts a JSON Schema to a Zod schema
 * This is only used as a fallback for $ref references, which fromJSONSchema doesn't handle
 * For non-$ref schemas, we use fromJSONSchema directly in the main function
 */
function convertJsonSchemaToZodRecursive(jsonSchema: JSONSchema7 | null | undefined): z.ZodType {
  // Defensive check: handle null/undefined schemas
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.any();
  }

  // For $ref schemas, we can't use fromJSONSchema directly
  // Return z.any() as a placeholder - $ref should be resolved before calling this
  if (jsonSchema.$ref) {
    return z.any();
  }

  // Try fromJSONSchema - it handles most cases
  const zodSchema = fromJSONSchema(jsonSchema as Record<string, unknown>);
  if (zodSchema !== undefined) {
    return zodSchema;
  }

  // If fromJSONSchema fails, return z.any() as last resort
  // This should be rare since fromJSONSchema handles most JSON Schema features
  return z.any();
}

/**
 * Converts a JSON Schema to a Zod schema using fromJSONSchema polyfill
 * @param jsonSchema - The JSON Schema to convert
 * @returns A Zod schema equivalent to the JSON Schema
 */
export function convertJsonSchemaToZod(jsonSchema: JSONSchema7 | null | undefined): z.ZodType {
  // Defensive check: handle null/undefined schemas (crash prevention)
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.any();
  }

  // Note: fromJSONSchema doesn't handle $ref, so we need to resolve them first
  // For now, if there's a $ref, fall back to recursive converter
  // TODO: Resolve $ref before calling fromJSONSchema when remote ref support is added
  if (jsonSchema.$ref) {
    return convertJsonSchemaToZodRecursive(jsonSchema);
  }

  // Use fromJSONSchema polyfill - it handles objects, arrays, strings, numbers, booleans,
  // enums, defaults, required fields, validation constraints, etc.
  const zodSchema = fromJSONSchema(jsonSchema as Record<string, unknown>);
  if (zodSchema !== undefined) {
    return zodSchema;
  }

  // If fromJSONSchema returns undefined (should be rare), fall back to recursive converter
  // This is a safety net for edge cases the polyfill might not handle
  return convertJsonSchemaToZodRecursive(jsonSchema);
}
