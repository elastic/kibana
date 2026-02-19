/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateKqlAgainstSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { EVENT_FIELD_PREFIX } from '../../common/trigger_registry/constants';

/**
 * Creates a Zod schema for condition examples (title + KQL condition) that validates each
 * condition string with validateKqlAgainstSchema so it must be valid KQL and only reference
 * properties from the given event schema (using EVENT_FIELD_PREFIX).
 *
 * @param eventSchema - Zod schema for the event payload (e.g. trigger event schema).
 * @returns Zod array schema for condition examples.
 *
 * @example Valid (event schema has severity and message)
 * const eventSchema = z.object({ severity: z.string(), message: z.string() });
 * createConditionExamplesSchema(eventSchema).parse([
 *   { title: 'High severity only', condition: 'event.severity: "high"' },
 *   { title: 'Message contains error', condition: 'event.message: *' },
 * ]);
 *
 * @example Invalid – field not in schema
 * createConditionExamplesSchema(eventSchema).parse([
 *   { title: 'Bad', condition: 'event.unknown: "x"' }, // throws: KQL references field 'event.unknown' which is not part of event.* properties.
 * ]);
 *
 * @example Invalid – not valid KQL
 * createConditionExamplesSchema(eventSchema).parse([
 *   { title: 'Bad', condition: 'event.severity ( unclosed' }, // throws: parse error
 * ]);
 */
export function createConditionExamplesSchema(eventSchema: z.ZodType) {
  const base = z.object({ title: z.string(), condition: z.string() });
  const conditionRefined = base.shape.condition.refine((val: string) => {
    const result = validateKqlAgainstSchema(val, eventSchema, {
      fieldPrefix: EVENT_FIELD_PREFIX,
    });
    return result.valid;
  }, 'Condition must be valid KQL and only reference properties from the event schema.');
  const entrySchema = base.extend({ condition: conditionRefined });
  return z.array(entrySchema);
}

/**
 * Single condition example (title + KQL condition), inferred from createConditionExamplesSchema.
 *
 * @example Valid
 * { title: 'Match high severity', condition: 'event.severity: "high"' }
 *
 * @example Invalid (condition would fail createConditionExamplesSchema)
 * { title: 'Bad', condition: 'event.unknown: "x"' }  // field not in event schema
 */
export type ConditionExample = z.infer<ReturnType<typeof createConditionExamplesSchema>>[number];
