/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonSchema } from './types';

/**
 * Standard JSON Schema keywords that are NOT metadata.
 * Any property not in this set is considered custom metadata.
 */
const STANDARD_JSON_SCHEMA_KEYS = new Set([
  '$schema',
  '$ref',
  '$defs',
  'definitions',
  '$id',
  'id',
  '$comment',
  '$anchor',
  '$vocabulary',
  '$dynamicRef',
  '$dynamicAnchor',
  'type',
  'enum',
  'const',
  'anyOf',
  'oneOf',
  'allOf',
  'not',
  'properties',
  'required',
  'additionalProperties',
  'patternProperties',
  'propertyNames',
  'minProperties',
  'maxProperties',
  'items',
  'prefixItems',
  'additionalItems',
  'minItems',
  'maxItems',
  'uniqueItems',
  'contains',
  'minContains',
  'maxContains',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'description',
  'default',
  'title',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',
  'if',
  'then',
  'else',
  'dependentSchemas',
  'dependentRequired',
  'nullable',
  'unevaluatedItems',
  'unevaluatedProperties',
]);

/**
 * Extracts metadata from a JSON Schema.
 *
 * Any property that is not a standard JSON Schema keyword is considered metadata.
 * This works with Zod v4's z.toJSONSchema() which outputs metadata directly.
 *
 * @param schema - JSON Schema with optional metadata properties
 * @returns Record with extracted metadata
 */
export function extractMeta(schema: JsonSchema): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (value === undefined) continue;

    if (!STANDARD_JSON_SCHEMA_KEYS.has(key)) {
      meta[key] = value as unknown;
    }
  }

  return meta;
}
