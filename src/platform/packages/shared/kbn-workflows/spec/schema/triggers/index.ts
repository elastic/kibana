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
import { CONNECTOR_ID_MAX_LENGTH, IF_CONDITION_MAX_LENGTH } from '../../../common/constants';

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
  condition: z.string().max(IF_CONDITION_MAX_LENGTH).optional(),
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

const CONNECTOR_ID_REQUIRED_ERROR = 'connector-id is required and must not be empty';

const connectorIdSchema = z
  .string()
  .min(1, CONNECTOR_ID_REQUIRED_ERROR)
  .max(CONNECTOR_ID_MAX_LENGTH)
  .regex(/^\S(?:.*\S)?$/, CONNECTOR_ID_REQUIRED_ERROR);

const CustomTriggerShapeSchema = z.object({
  type: z.string(),
  'connector-id': z.string().optional(),
  on: CustomTriggerOnSchema,
});

/**
 * Runtime YAML shape for a registered (non-built-in) trigger.
 * `connector-id` is required in the Zod schema when `requiresConnectorId` is set.
 */
export type CustomTrigger = z.infer<typeof CustomTriggerShapeSchema>;

export interface CustomTriggerSchemaConfig {
  id: string;
  requiresConnectorId?: boolean;
}

export type CustomTriggerSchemaInput = string | CustomTriggerSchemaConfig;

const toCustomTriggerSchemaConfig = (
  trigger: CustomTriggerSchemaInput
): CustomTriggerSchemaConfig => (typeof trigger === 'string' ? { id: trigger } : trigger);

const dedupeCustomTriggerSchemaConfigs = (
  configs: CustomTriggerSchemaConfig[]
): CustomTriggerSchemaConfig[] => {
  const byId = new Map<string, CustomTriggerSchemaConfig>();
  for (const config of configs) {
    byId.set(config.id, config);
  }
  return [...byId.values()];
};

/**
 * Maps registered trigger definitions to the YAML schema input shape.
 * Duplicate ids keep the last `requiresConnectorId` value.
 */
export const toCustomTriggerSchemaConfigs = (
  triggers: Array<{ id: string; requiresConnectorId?: boolean }>
): CustomTriggerSchemaConfig[] =>
  dedupeCustomTriggerSchemaConfigs(
    triggers.map(({ id, requiresConnectorId }) => ({ id, requiresConnectorId }))
  );

/**
 * YAML Zod schema for a registered (non-built-in) trigger.
 */
export const getCustomTriggerZodSchema = ({
  id,
  requiresConnectorId,
}: CustomTriggerSchemaConfig) => {
  if (requiresConnectorId) {
    return z.object({
      type: z.literal(id),
      'connector-id': connectorIdSchema,
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
 * Pass `{ id, requiresConnectorId: true }` to require a non-empty `connector-id`;
 * a plain string id stays `{ type, on? }` (e.g. `getTriggerSchema(['cases.updated'])`).
 */
export function getTriggerSchema(customTriggers: CustomTriggerSchemaInput[] = []): z.ZodType {
  if (customTriggers.length === 0) {
    return TriggerSchema;
  }
  const customSchemas = dedupeCustomTriggerSchemaConfigs(
    customTriggers.map(toCustomTriggerSchemaConfig)
  ).map((trigger) => getCustomTriggerZodSchema(trigger));
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
