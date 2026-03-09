/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';

/**
 * Generates a sample value from a JSON Schema.
 * Used for placeholder/sample values in forms and autocomplete when no default is set.
 */
export function generateSampleFromJsonSchema(schema: JSONSchema7): unknown {
  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return schema.format === 'email' ? 'user@example.com' : 'string';
    case 'number':
      return 0;
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array': {
      const items = schema.items as JSONSchema7 | undefined;
      if (items) {
        return [generateSampleFromJsonSchema(items)];
      }
      return [];
    }
    case 'object': {
      const sample: Record<string, unknown> = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const prop = propSchema as JSONSchema7;
          const isRequired = schema.required?.includes(key) ?? false;
          if (isRequired || prop.default !== undefined) {
            sample[key] = generateSampleFromJsonSchema(prop);
          }
        }
      }
      return sample;
    }
    default:
      return undefined;
  }
}
