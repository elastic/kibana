/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import type { JsonSchema } from './types';
import { extractMeta } from './meta_utils';

type JsonSchemaParser = (schema: JsonSchema) => z.ZodType;

export function parseObject(
  schema: JsonSchema,
  parseJsonSchema: JsonSchemaParser
): z.ZodObject<z.ZodRawShape> {
  const shape: Record<string, z.ZodType> = {};
  const requiredFields = new Set(schema.required || []);
  const properties = schema.properties || {};

  for (const [key, propSchema] of Object.entries(properties)) {
    let fieldSchema = parseJsonSchema(propSchema);
    const fieldMeta = extractMeta(propSchema);

    if (!requiredFields.has(key)) {
      fieldSchema = fieldSchema.optional();
    }

    if ('default' in propSchema && propSchema.default !== undefined) {
      fieldSchema = fieldSchema.default(propSchema.default);
    }

    if (Object.keys(fieldMeta).length > 0) {
      z.globalRegistry.add(fieldSchema, fieldMeta as Record<string, unknown>);
    }

    shape[key] = fieldSchema;
  }

  return z.object(shape);
}
