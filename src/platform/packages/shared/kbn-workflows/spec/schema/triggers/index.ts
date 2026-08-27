/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { AlertRuleTriggerSchema } from './alert_trigger_schema';
import { ManualTriggerSchema } from './manual_trigger_schema';
import { ScheduledTriggerSchema } from './scheduled_trigger_schema';

export { AlertRuleTriggerSchema } from './alert_trigger_schema';
export { ManualTriggerSchema } from './manual_trigger_schema';
export {
  ScheduledTriggerSchema,
  SCHEDULED_INTERVAL_ERROR,
  SCHEDULED_INTERVAL_PATTERN,
} from './scheduled_trigger_schema';

export const TriggerSchema = z.discriminatedUnion('type', [
  AlertRuleTriggerSchema,
  ScheduledTriggerSchema,
  ManualTriggerSchema,
]);

export type Trigger = z.infer<typeof TriggerSchema>;

/** Allowed values for `on.workflowEvents` on custom (event-driven) triggers. */
const WORKFLOW_EVENTS_VALUES = ['ignore', 'allow-all', 'avoid-loop'] as const;
export type WorkflowEventsValue = (typeof WORKFLOW_EVENTS_VALUES)[number];
export const WORKFLOW_EVENTS_VALUES_SET = new Set<string>(WORKFLOW_EVENTS_VALUES);
export const WorkflowEventsSchema = z.enum(WORKFLOW_EVENTS_VALUES);

/**
 * Schema for the `on` block of custom (event-driven) triggers.
 * Engine-level YAML — not part of a trigger's `eventSchema`.
 */
export const CustomTriggerOnSchema = z
  .object({
    condition: z
      .string()
      .optional()
      .describe(
        i18n.translate('workflows.customTriggerOn.schema.condition', {
          defaultMessage:
            'Optional KQL predicate evaluated against the event payload. The trigger fires only when the condition matches.',
        })
      ),
    workflowEvents: WorkflowEventsSchema.optional().describe(
      i18n.translate('workflows.customTriggerOn.schema.workflowEvents', {
        defaultMessage:
          'How this trigger responds when the event originated from a workflow run. `avoid-loop` (default) fires on workflow-generated events but skips scheduling when this workflow is already in the event chain; `ignore` skips workflow-generated events and reacts only to external signals; `allow-all` bypasses the cycle guard (the maximum chain depth still applies as a backstop).',
      })
    ),
  })
  .optional();

/**
 * Returns a trigger schema that includes built-in types plus optional registered trigger ids.
 * Used by the YAML editor so custom trigger types (e.g. example.custom_trigger) pass validation.
 * Custom triggers allow an `on.condition` clause for KQL filtering.
 */
export function getTriggerSchema(customTriggerIds: string[] = []): z.ZodType {
  if (customTriggerIds.length === 0) {
    return TriggerSchema;
  }
  const customSchemas = customTriggerIds.map((id) =>
    z.object({
      type: z.literal(id),
      on: CustomTriggerOnSchema,
    })
  );
  return z.discriminatedUnion('type', [
    AlertRuleTriggerSchema,
    ScheduledTriggerSchema,
    ManualTriggerSchema,
    ...customSchemas,
  ]);
}

export const TriggerTypes = [
  AlertRuleTriggerSchema.shape.type.value,
  ScheduledTriggerSchema.shape.type.value,
  ManualTriggerSchema.shape.type.value,
];
export type TriggerType = (typeof TriggerTypes)[number];
