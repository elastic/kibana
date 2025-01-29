/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';

/**
 * Safely parse a payload against a schema, returning the output or undefined.
 * This method does not throw validation errors and is useful for validating
 * optional objects when we don't care about errors.
 *
 * @param payload Schema payload
 * @param schema Validation schema
 * @returns Schema output or undefined
 */
export function safeParseResult<T extends z.ZodTypeAny>(
  payload: unknown,
  schema: T
): T['_output'] | undefined {
  const result = schema.safeParse(payload);
  if (result.success) {
    return result.data;
  }
}
