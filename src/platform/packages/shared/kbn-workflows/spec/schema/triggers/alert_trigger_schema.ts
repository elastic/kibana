/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const AlertRuleTriggerSchema = z.object({
  type: z.literal('alert'),
});
export type AlertRuleTrigger = z.infer<typeof AlertRuleTriggerSchema>;

// Note: AlertSchema from '@kbn/alerts-as-data-utils' uses io-ts runtime types, not Zod.
// Once a Zod-compatible version is available, we should import and use it instead.
export const AlertSchema = z.object({
  _id: z.string(),
  _index: z.string(),
  kibana: z.object({
    alert: z.unknown(),
  }),
  '@timestamp': z.string(),
});

export const RuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(z.string()),
  consumer: z.string(),
  producer: z.string(),
  ruleTypeId: z.string(),
});

/**
 * Full event schema (used for runtime validation of alert-triggered workflows).
 * For autocomplete, use getEventSchemaForTriggers() to get a trigger-aware schema.
 */
export const AlertEventSchema = z.object({
  alerts: z.array(z.union([AlertSchema, z.unknown()])),
  rule: RuleSchema,
  params: z.unknown(),
  spaceId: z.string().describe('The space where the event was emitted.'),
});
export type AlertEvent = z.infer<typeof AlertEventSchema>;

export const isAlertTrigger = (trigger: { type?: string }): trigger is AlertRuleTrigger =>
  trigger.type === 'alert';
