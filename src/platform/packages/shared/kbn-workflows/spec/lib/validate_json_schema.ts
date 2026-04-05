/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { JsonModelShapeSchema } from '../schema/common/json_model_shape_schema';

/**
 * Keywords not modeled by {@link JsonModelShapeSchema} (no autocomplete / conversion path).
 * Checked explicitly so we do not rely on Zod stripping unknown keys (non-strict objects).
 */
const UNSUPPORTED_JSON_MODEL_KEYWORDS = new Set([
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'patternProperties',
  'additionalItems',
  'contains',
  'propertyNames',
]);

/**
 * True when `schema` matches the supported workflow JSON-model surface (JsonModelShapeSchema).
 *
 * Used only from `JsonModelSchema` refinements in `json_model_schema.ts` (workflow `inputs` /
 * `outputs`, and `wait` step `with.schema` for wait-for-input).
 */
export function isValidJsonSchema(schema: unknown): schema is JSONSchema7 {
  if (typeof schema !== 'object' || schema === null) {
    return false;
  }

  const schemaObj = schema as Record<string, unknown>;

  const hasValidStructure =
    'type' in schemaObj ||
    '$ref' in schemaObj ||
    'anyOf' in schemaObj ||
    'oneOf' in schemaObj ||
    'const' in schemaObj ||
    'enum' in schemaObj ||
    'properties' in schemaObj ||
    'items' in schemaObj ||
    'definitions' in schemaObj ||
    '$defs' in schemaObj;

  if (!hasValidStructure) {
    return false;
  }

  if (jsonModelContainsUnsupportedKeywords(schema)) {
    return false;
  }

  return JsonModelShapeSchema.safeParse(schema).success;
}

function jsonModelContainsUnsupportedKeywords(node: unknown): boolean {
  if (node === null || typeof node !== 'object') {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(jsonModelContainsUnsupportedKeywords);
  }
  const o = node as Record<string, unknown>;
  for (const key of UNSUPPORTED_JSON_MODEL_KEYWORDS) {
    if (key in o) {
      return true;
    }
  }
  if (
    'additionalProperties' in o &&
    typeof o.additionalProperties === 'object' &&
    o.additionalProperties !== null
  ) {
    return true;
  }

  for (const [key, val] of Object.entries(o)) {
    // Non-schema payloads; do not traverse (avoids treating default/const objects as schema nodes).
    const skipRecursion =
      key === 'default' ||
      key === 'const' ||
      key === 'enum' ||
      key === 'title' ||
      key === 'description' ||
      key === 'pattern' ||
      key === 'type' ||
      key === 'format' ||
      key === 'required';
    if (!skipRecursion && jsonModelContainsUnsupportedKeywords(val)) {
      return true;
    }
  }
  return false;
}
