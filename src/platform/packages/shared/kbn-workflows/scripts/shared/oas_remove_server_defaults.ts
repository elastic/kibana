/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Reads the elasticsearch-specification schema.json to find all fields
 * that have a `serverDefault` property. These are server-side defaults
 * that should NOT be applied by the client.
 *
 * In the TypeScript spec files, these are marked with `@server_default`:
 * ```
 * // @server_default false
 * include_ccs_metadata?: boolean
 * ```
 *
 * The schema.json preserves this as a separate `serverDefault` field,
 * which we use to identify fields whose `default` should be removed
 * from the OpenAPI spec before generating Zod schemas.
 */
function getServerDefaultFields(schemaPath: string): Set<string> {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const serverDefaultFields = new Set<string>();

  const findServerDefaults = (obj: unknown): void => {
    if (Array.isArray(obj)) {
      obj.forEach(findServerDefaults);
    } else if (obj && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      // Check if this object has serverDefault and name properties
      if ('serverDefault' in record && 'name' in record && typeof record.name === 'string') {
        serverDefaultFields.add(record.name);
      }
      // Recurse into all values
      Object.values(record).forEach(findServerDefaults);
    }
  };

  findServerDefaults(schema);
  return serverDefaultFields;
}

/**
 * Removes 'default' values from OpenAPI properties that have `serverDefault`
 * in the elasticsearch-specification schema.json.
 *
 * This prevents the Zod schema generator from adding `.default()` calls
 * for server-side defaults, which would cause the client to send values
 * that the server should be applying itself.
 *
 * Example issue this fixes:
 * - Both `include_ccs_metadata` and `include_execution_metadata` have @server_default false
 * - Without this fix, both get sent as `false` to Elasticsearch
 * - Elasticsearch throws: "Both [include_execution_metadata] and [include_ccs_metadata] query parameters are set"
 */
export function createRemoveServerDefaults(schemaPath: string) {
  return function removeServerDefaults(spec: OpenAPIV3.Document): OpenAPIV3.Document {
    const serverDefaultFields = getServerDefaultFields(schemaPath);

    const removeDefaults = (obj: unknown): unknown => {
      if (Array.isArray(obj)) {
        return obj.map(removeDefaults);
      }
      if (obj && typeof obj === 'object') {
        const record = obj as Record<string, unknown>;
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(record)) {
          if (key === 'properties' && typeof value === 'object' && value !== null) {
            // Process properties - check each property name against serverDefaultFields
            const props: Record<string, unknown> = {};
            const valueRecord = value as Record<string, unknown>;
            for (const [propName, propValue] of Object.entries(valueRecord)) {
              const propRecord = propValue as Record<string, unknown>;
              if (
                serverDefaultFields.has(propName) &&
                typeof propValue === 'object' &&
                propValue !== null &&
                'default' in propRecord
              ) {
                // Remove the 'default' key from this property
                const { default: _removed, ...rest } = propRecord;
                props[propName] = removeDefaults(rest);
              } else {
                props[propName] = removeDefaults(propValue);
              }
            }
            result[key] = props;
          } else {
            result[key] = removeDefaults(value);
          }
        }
        return result;
      }
      return obj;
    };

    return removeDefaults(spec) as OpenAPIV3.Document;
  };
}
