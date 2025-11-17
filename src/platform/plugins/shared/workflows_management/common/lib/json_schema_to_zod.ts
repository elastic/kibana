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
 * Converts a JSON Schema to a Zod schema
 * @param jsonSchema - The JSON Schema to convert
 * @returns A Zod schema equivalent to the JSON Schema
 */
export function convertJsonSchemaToZod(jsonSchema: JSONSchema7): z.ZodType {
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
    // If conversion fails, fallback to z.any() to avoid breaking the workflow
    // This can happen with complex schemas that the converter doesn't support
    // console.warn('Failed to convert JSON Schema to Zod:', error);
    return z.any();
  }
}
