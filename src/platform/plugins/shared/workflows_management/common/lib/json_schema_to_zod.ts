/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { JSONSchema7 } from 'json-schema';
import { z } from '@kbn/zod';

/**
 * Recursively converts a JSON Schema object to a Zod object schema
 * This is a fallback when @n8n/json-schema-to-zod fails
 */
function convertJsonSchemaToZodRecursive(jsonSchema: JSONSchema7): z.ZodType {
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const shape: Record<string, z.ZodType> = {};
    for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
      const prop = propSchema as JSONSchema7;
      let zodProp = convertJsonSchemaToZodRecursive(prop);

      // Check if required - use the parent schema's required array
      const isRequired = jsonSchema.required?.includes(key) ?? false;

      // Apply default if present (default() automatically makes the field optional)
      if (prop.default !== undefined) {
        zodProp = zodProp.default(prop.default);
      } else if (!isRequired) {
        // Only apply optional if no default and not required
        // (default() already makes it optional, so we don't need both)
        zodProp = zodProp.optional();
      }

      shape[key] = zodProp;
    }
    return z.object(shape);
  }

  if (jsonSchema.type === 'array' && jsonSchema.items) {
    const itemsSchema = convertJsonSchemaToZodRecursive(jsonSchema.items as JSONSchema7);
    return z.array(itemsSchema);
  }

  if (jsonSchema.type === 'string') {
    let schema = z.string();
    if (jsonSchema.enum && Array.isArray(jsonSchema.enum) && jsonSchema.enum.length > 0) {
      // z.enum requires at least one element
      schema = z.enum(jsonSchema.enum as [string, ...string[]]);
    }
    return schema;
  }

  if (jsonSchema.type === 'number' || jsonSchema.type === 'integer') {
    return z.number();
  }

  if (jsonSchema.type === 'boolean') {
    return z.boolean();
  }

  // Fallback to any for unsupported types
  return z.any();
}

/**
 * Converts a JSON Schema to a Zod schema
 * @param jsonSchema - The JSON Schema to convert
 * @returns A Zod schema equivalent to the JSON Schema
 */
export function convertJsonSchemaToZod(jsonSchema: JSONSchema7): z.ZodType {
  // For nested objects, always use our recursive converter to ensure proper structure
  // This is critical for variable validation to work correctly with nested paths
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    return convertJsonSchemaToZodRecursive(jsonSchema);
  }

  try {
    // @n8n/json-schema-to-zod returns a string of Zod code
    const zodCode = jsonSchemaToZod(jsonSchema);

    // We need to evaluate the generated code to get the actual Zod schema
    // This is safe because:
    // 1. We control the input (validated JSON Schema from our own schema validation)
    // 2. The output is from a trusted library (@n8n/json-schema-to-zod)
    // 3. The generated code only uses Zod API calls, no arbitrary code execution
    // The generated code may reference Object, Array, etc., so we provide them in the context
    // eslint-disable-next-line no-new-func
    const zodSchema = new Function(
      'z',
      'Object',
      'Array',
      'String',
      'Number',
      'Boolean',
      `return ${zodCode}`
    )(z, Object, Array, String, Number, Boolean);

    return zodSchema as z.ZodType;
  } catch (error) {
    // If conversion fails, try recursive fallback
    // This ensures nested objects are properly converted even if the library fails
    // This is important for variable validation to work correctly
    try {
      return convertJsonSchemaToZodRecursive(jsonSchema);
    } catch (fallbackError) {
      // If even the fallback fails, return z.any() as last resort
      // This can happen with very complex schemas that we don't support
      return z.any();
    }
  }
}
