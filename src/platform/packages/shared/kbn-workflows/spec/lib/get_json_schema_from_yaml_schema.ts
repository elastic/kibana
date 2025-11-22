/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { JSONSchema } from '@kbn/zod/v4/core';

export function getJsonSchemaFromYamlSchema(yamlSchema: z.ZodType): JSONSchema.JSONSchema | null {
  try {
    return z.toJSONSchema(yamlSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'ref',
      override: (ctx) => {
        // TODO: remove fields, which has default or optional from 'required' array because we validating user input not the result of safeParse. e.g. 'version' shouldn't be required
        // we'd love to use 'io:input' but it results in memory leak
        if (ctx.jsonSchema.required && ctx.jsonSchema.required.length > 0) {
          const newRequired = ctx.jsonSchema.required.filter((field) => {
            const fieldSchema = ctx.jsonSchema.properties?.[field] as
              | JSONSchema.JSONSchema
              | undefined;
            return fieldSchema && !('default' in fieldSchema) && !('optional' in fieldSchema);
          });
          ctx.jsonSchema.required = newRequired.length > 0 ? newRequired : undefined;
        }
        // TODO: remove useless anyOf from schema or at the zod level
        // if (ctx.jsonSchema.anyOf) {
        //   ctx.jsonSchema.anyOf = ctx.jsonSchema.anyOf.filter((schema) => !isEmptyObject(schema));
        // }
      },
    });
  } catch (error) {
    // console.error('Error generating JSON schema from YAML schema:', error);
    return null;
  }
}

function isEmptyObject(jsonSchema: JSONSchema.JSONSchema): boolean {
  return (
    jsonSchema.type === 'object' &&
    Object.keys(jsonSchema.properties ?? {}).length === 0 &&
    Object.keys(jsonSchema.additionalProperties ?? {}).length === 0
  );
}
