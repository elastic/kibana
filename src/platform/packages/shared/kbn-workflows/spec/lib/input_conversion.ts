/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeFieldsToJsonSchema } from './field_conversion';
import type { JsonModelSchemaType } from '../schema/common/json_model_schema';

/**
 * Temporary backward compatibility for consumers that import from input_conversion
 * (e.g. agent_builder). Delegates to normalizeFieldsToJsonSchema so no code changes
 * are required in those plugins. Accepts unknown to avoid casts at call sites.
 *
 * @param inputs - The inputs to normalize (legacy array or JSON Schema object)
 * @returns The inputs in JSON Schema object format, or undefined
 */
export function normalizeInputsToJsonSchema(inputs?: unknown): JsonModelSchemaType | undefined {
  return normalizeFieldsToJsonSchema(inputs);
}
