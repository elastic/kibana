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
 * True when `schema` parses as `JsonModelShapeSchema` (workflow JSON-model surface).
 * Unknown keys use Zod’s default stripping on the modeled object shape.
 *
 * Used only from `JsonModelSchema` refinements in `json_model_schema.ts` (workflow `inputs` /
 * `outputs` and steps `with.schema`).
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

  return JsonModelShapeSchema.safeParse(schema).success;
}
