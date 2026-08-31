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

/** Schema for the `on` block of custom triggers (KQL condition to filter when the workflow runs). */
const CustomTriggerOnObjectSchema = z.object({
  condition: z.string().optional(),
  /**
   * How this trigger responds when the event was emitted from a workflow-attributed chain:
   * `ignore` — do not schedule;
   * `avoid-loop` — schedule with cycle guard (default when omitted);
   * `allow-all` — schedule without cycle guard (max chain depth still applies).
   */
  workflowEvents: WorkflowEventsSchema.optional(),
});
const CustomTriggerOnSchema = CustomTriggerOnObjectSchema.optional();
export type CustomTriggerOn = z.infer<typeof CustomTriggerOnObjectSchema>;

/**
 * Runtime YAML shape for a registered (non-built-in) trigger.
 * `connector-id` is required in the Zod schema when `requiresConnectorId` is set.
 */
export interface CustomTrigger {
  type: string;
  'connector-id'?: string;
  on?: CustomTriggerOn;
}

export interface CustomTriggerSchemaConfig {
  id: string;
  requiresConnectorId?: boolean;
}

export type CustomTriggerSchemaInput = string | CustomTriggerSchemaConfig;

const CONNECTOR_ID_REQUIRED_ERROR = 'connector-id is required and must not be empty';

const toCustomTriggerSchemaConfig = (
  trigger: CustomTriggerSchemaInput
): CustomTriggerSchemaConfig => (typeof trigger === 'string' ? { id: trigger } : trigger);

const customTriggerSchema = ({ id, requiresConnectorId }: CustomTriggerSchemaConfig) => {
  if (requiresConnectorId) {
    return z.object({
      type: z.literal(id),
      'connector-id': z.string().trim().min(1, CONNECTOR_ID_REQUIRED_ERROR),
      on: CustomTriggerOnSchema,
    });
  }

  return z.object({
    type: z.literal(id),
    on: CustomTriggerOnSchema,
  });
};

/**
 * Returns a trigger schema that includes built-in types plus optional registered trigger ids.
 * Used by the YAML editor so custom trigger types (e.g. example.custom_trigger) pass validation.
 * Custom triggers allow an `on.condition` clause for KQL filtering.
 * Triggers with `requiresConnectorId` must include a non-empty `connector-id`.
 */
export function getTriggerSchema(customTriggers: CustomTriggerSchemaInput[] = []): z.ZodType {
  if (customTriggers.length === 0) {
    return TriggerSchema;
  }
  const customSchemas = customTriggers.map((trigger) =>
    customTriggerSchema(toCustomTriggerSchemaConfig(trigger))
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
