/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { AlertRuleTriggerSchema } from './alert_trigger_schema';
import { getManualTriggerSchema, ManualTriggerSchema } from './manual_trigger_schema';
import { ScheduledTriggerSchema } from './scheduled_trigger_schema';

export { AlertEventSchema, AlertRuleTriggerSchema, type AlertEvent } from './alert_trigger_schema';
export {
  DOCUMENT_EVENT_MAX_DATA_VIEW_LENGTH,
  DOCUMENT_EVENT_MAX_DOCUMENTS,
  DOCUMENT_EVENT_MAX_FIELD_NAME_LENGTH,
  DOCUMENT_EVENT_MAX_ID_LENGTH,
  DOCUMENT_EVENT_MAX_INDEX_LENGTH,
  DOCUMENT_EVENT_MAX_QUERY_LENGTH,
  DOCUMENT_EVENT_MAX_TIMESTAMP_LENGTH,
  DocumentEventSchema,
  type DocumentEvent,
} from './document_event_schema';
export {
  getManualTriggerSchema,
  MANUAL_WORKFLOW_EVENT_TYPE_MAX_LENGTH,
  ManualTriggerSchema,
} from './manual_trigger_schema';
export { WORKFLOWS_ALERT_EVENT_TYPE, WORKFLOWS_DOCUMENT_EVENT_TYPE } from './manual_event_types';
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

export const MULTIPLE_MANUAL_EVENT_TYPES_ERROR =
  'A workflow cannot declare more than one manual trigger with an eventType.';

export const getWorkflowTriggersSchema = <TriggerSchemaType extends z.ZodType>(
  triggerSchema: TriggerSchemaType
) =>
  z
    .array(triggerSchema)
    .min(1)
    .superRefine((triggers, context) => {
      const typedManualTriggerIndices = triggers.flatMap((trigger, index) => {
        if (
          typeof trigger === 'object' &&
          trigger !== null &&
          'type' in trigger &&
          trigger.type === 'manual' &&
          'eventType' in trigger &&
          trigger.eventType !== undefined
        ) {
          return [index];
        }
        return [];
      });

      if (typedManualTriggerIndices.length > 1) {
        context.addIssue({
          code: 'custom',
          message: MULTIPLE_MANUAL_EVENT_TYPES_ERROR,
          path: [typedManualTriggerIndices[1], 'eventType'],
        });
      }
    });

/** Allowed values for `on.workflowEvents` on custom (event-driven) triggers. */
const WORKFLOW_EVENTS_VALUES = ['ignore', 'allow-all', 'avoid-loop'] as const;
export type WorkflowEventsValue = (typeof WORKFLOW_EVENTS_VALUES)[number];
export const WORKFLOW_EVENTS_VALUES_SET = new Set<string>(WORKFLOW_EVENTS_VALUES);
export const WorkflowEventsSchema = z.enum(WORKFLOW_EVENTS_VALUES);

/** Schema for the `on` block of custom triggers (KQL condition to filter when the workflow runs). */
const CustomTriggerOnSchema = z
  .object({
    condition: z.string().optional(),
    /**
     * How this trigger responds when the event was emitted from a workflow-attributed chain:
     * `ignore` — do not schedule;
     * `avoid-loop` — schedule with cycle guard (default when omitted);
     * `allow-all` — schedule without cycle guard (max chain depth still applies).
     */
    workflowEvents: WorkflowEventsSchema.optional(),
  })
  .optional();

/**
 * Returns a trigger schema that includes built-in types plus optional registered trigger ids.
 * Used by the YAML editor so custom trigger types (e.g. example.custom_trigger) pass validation.
 * Custom triggers allow an `on.condition` clause for KQL filtering.
 */
export function getTriggerSchema(
  customTriggerIds: string[] = [],
  manualWorkflowEventIds: string[] = []
): z.ZodType {
  const manualTriggerSchema = getManualTriggerSchema(manualWorkflowEventIds);

  if (customTriggerIds.length === 0 && manualWorkflowEventIds.length === 0) {
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
    manualTriggerSchema,
    ...customSchemas,
  ]);
}

export const TriggerTypes = [
  AlertRuleTriggerSchema.shape.type.value,
  ScheduledTriggerSchema.shape.type.value,
  ManualTriggerSchema.shape.type.value,
];
export type TriggerType = (typeof TriggerTypes)[number];
