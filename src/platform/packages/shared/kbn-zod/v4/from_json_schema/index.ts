/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This folder contains a custom JSON Schema → Zod converter that serves as
 * a polyfill until Kibana fully migrates to Zod v4, which has native
 * fromJSONSchema support.
 */
import { z } from 'zod/v4';
import type { JsonSchema } from './types';
import { extractMeta } from './meta_utils';
import { parseString } from './parse_string';
import { parseNumber } from './parse_number';
import { parseBoolean } from './parse_boolean';
import { parseEnum } from './parse_enum';
import { parseLiteral } from './parse_literal';
import { parseObject } from './parse_object';
import { parseArray } from './parse_array';
import { parseUnion } from './parse_union';

export type { JsonSchema } from './types';
export { extractMeta as extractUiMeta } from './meta_utils';

/**
 * Converts a JSON Schema object to a native Zod v4 schema at runtime.
 *
 * This is a temporary polyfill for Zod v4's native fromJSONSchema function.
 */
export function fromJSONSchema(jsonSchema: Record<string, unknown>): z.ZodType | undefined {
  try {
    return parseJsonSchema(jsonSchema as JsonSchema);
  } catch {
    return undefined;
  }
}

function parseJsonSchema(schema: JsonSchema): z.ZodType {
  const zodSchema = parseSchemaByType(schema);

  const meta = extractMeta(schema);
  if (Object.keys(meta).length > 0) {
    z.globalRegistry.add(zodSchema, meta as Record<string, unknown>);
  }

  return zodSchema;
}

function parseSchemaByType(schema: JsonSchema): z.ZodType {
  if (schema.anyOf || schema.oneOf) {
    return parseUnion(schema, parseJsonSchema);
  }

  if ('const' in schema) {
    return parseLiteral(schema);
  }

  if (schema.enum) {
    return parseEnum(schema);
  }

  switch (schema.type) {
    case 'string':
      return parseString(schema);
    case 'number':
    case 'integer':
      return parseNumber(schema);
    case 'boolean':
      return parseBoolean();
    case 'object':
      return parseObject(schema, parseJsonSchema);
    case 'array':
      return parseArray(schema, parseJsonSchema);
    case 'null':
      return z.null();
    default:
      return z.unknown();
  }
}
