/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ValidateKqlAgainstSchemaResult } from '@kbn/workflows';
import { validateKqlAgainstSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { EVENT_FIELD_PREFIX } from '../../common/trigger_registry/constants';

/** Schema for shape only: each item must have title and condition strings. Use validateConditionExamples() for KQL/schema validation. */
export const conditionExamplesSchema = z.array(
  z.object({ title: z.string(), condition: z.string() })
);

/** Single condition example (title + KQL condition). Validate with validateConditionExamples. */
export type ConditionExample = z.infer<typeof conditionExamplesSchema>[number];

/**
 * Validates that each condition example's condition string is valid KQL and only
 * references properties from the event schema. Returns the first specific error
 * from validateKqlAgainstSchema so callers can show detailed messages.
 *
 * @param examples - Condition examples (e.g. from a trigger definition).
 * @param eventSchema - Zod schema for the event payload.
 * @returns { valid: true } or { valid: false, error: string } with the specific validation error.
 */
export function validateConditionExamples(
  examples: ConditionExample[],
  eventSchema: z.ZodType
): ValidateKqlAgainstSchemaResult {
  for (const { condition } of examples) {
    const result = validateKqlAgainstSchema(condition, eventSchema, {
      fieldPrefix: EVENT_FIELD_PREFIX,
    });
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
