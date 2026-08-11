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

type JsonSchemaParser = (schema: JsonSchema) => z.ZodType;

export function parseArray(
  schema: JsonSchema,
  parseJsonSchema: JsonSchemaParser
): z.ZodArray<z.ZodType> {
  const itemSchema = schema.items ? parseJsonSchema(schema.items) : z.unknown();

  let za = z.array(itemSchema);

  if (schema.minItems !== undefined) {
    za = za.min(schema.minItems);
  }
  if (schema.maxItems !== undefined) {
    za = za.max(schema.maxItems);
  }

  return za;
}
