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
import type { z } from '@kbn/zod/v4';
import { EVENT_FIELD_PREFIX } from '../../common/trigger_registry/constants';

/**
 * Validates that each KQL condition string is valid KQL and only references
 * properties from the event schema. Returns the first specific error from
 * validateKqlAgainstSchema so callers can show detailed messages.
 *
 * This module is intended to be loaded dynamically (e.g. when a trigger with
 * conditionExamples or defaultCondition is registered) so that @kbn/workflows
 * and @kbn/es-query are not included in the page-load bundle.
 *
 * @param kqlConditions - Array of KQL condition strings to validate.
 * @param eventSchema - Zod schema for the event payload.
 * @returns { valid: true } or { valid: false, error: string } with the specific validation error.
 */
export function validateKqlConditions(
  kqlConditions: string[],
  eventSchema: z.ZodType
): ValidateKqlAgainstSchemaResult {
  for (const condition of kqlConditions) {
    const result = validateKqlAgainstSchema(condition, eventSchema, {
      fieldPrefix: EVENT_FIELD_PREFIX,
    });
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}
