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

export interface FromJSONSchemaOptions {
  /**
   * Restore non-standard JSON Schema keys as Zod UI metadata.
   *
   * This writes to `z.globalRegistry`, so callers should opt in only when they
   * actually need metadata-driven UI behavior.
   */
  preserveMeta?: boolean;
}

/**
 * Converts a JSON Schema object to a native Zod v4 schema at runtime.
 *
 * This is a temporary polyfill for Zod v4's native fromJSONSchema function.
 */
export function fromJSONSchema(
  jsonSchema: Record<string, unknown>,
  options: FromJSONSchemaOptions = {}
): z.ZodType | undefined {
  const { preserveMeta = false } = options;

  try {
    const parseJsonSchema = (schema: JsonSchema): z.ZodType => {
      const zodSchema = parseSchemaByType(schema, parseJsonSchema, preserveMeta);

      if (preserveMeta) {
        const meta = extractMeta(schema);
        if (Object.keys(meta).length > 0) {
          z.globalRegistry.add(zodSchema, meta as Record<string, unknown>);
        }
      }

      return zodSchema;
    };

    return parseJsonSchema(jsonSchema as JsonSchema);
  } catch {
    return undefined;
  }
}

function parseSchemaByType(
  schema: JsonSchema,
  parseJsonSchema: (schema: JsonSchema) => z.ZodType,
  preserveMeta: boolean
): z.ZodType {
  let zodSchema: z.ZodType;

  if (schema.anyOf || schema.oneOf) {
    zodSchema = parseUnion(schema, parseJsonSchema);
  } else if ('const' in schema) {
    zodSchema = parseLiteral(schema);
  } else if (schema.enum) {
    zodSchema = parseEnum(schema);
  } else {
    switch (schema.type) {
      case 'string':
        zodSchema = parseString(schema);
        break;
      case 'number':
      case 'integer':
        zodSchema = parseNumber(schema);
        break;
      case 'boolean':
        zodSchema = parseBoolean();
        break;
      case 'object':
        zodSchema = parseObject(schema, parseJsonSchema, preserveMeta);
        break;
      case 'array':
        zodSchema = parseArray(schema, parseJsonSchema);
        break;
      case 'null':
        zodSchema = z.null();
        break;
      default:
        zodSchema = z.unknown();
    }
  }

  // JSON Schema nullable: true means the value can be null
  if (schema.nullable === true) {
    return z.union([zodSchema, z.null()]);
  }

  return zodSchema;
}
