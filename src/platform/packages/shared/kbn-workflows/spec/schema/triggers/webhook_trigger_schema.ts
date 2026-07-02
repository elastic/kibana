/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { WorkflowInputSchema } from './manual_trigger_schema';
import { BaseEventSchema } from '../common/base_event';

export const WebhookTriggerAuthNoneSchema = z.object({
  type: z.literal('none'),
});

export const WebhookTriggerAuthApiKeySchema = z.object({
  type: z.literal('apiKey'),
  id: z.string().optional(),
});

export const WebhookTriggerAuthBasicSchema = z.object({
  type: z.literal('basic'),
  username: z.string().min(1),
  password: z.string().min(1),
});

export const WebhookTriggerAuthSchema = z.discriminatedUnion('type', [
  WebhookTriggerAuthNoneSchema,
  WebhookTriggerAuthApiKeySchema,
  WebhookTriggerAuthBasicSchema,
]);

export type WebhookTriggerAuth = z.infer<typeof WebhookTriggerAuthSchema>;

export const WebhookTriggerSchema = z.object({
  type: z.literal('webhook'),
  inputs: WorkflowInputSchema.optional(),
  auth: WebhookTriggerAuthSchema.optional(),
});
export type WebhookTrigger = z.infer<typeof WebhookTriggerSchema>;

export const WebhookTriggerEventSchema = BaseEventSchema.extend({
  inputs: z.unknown().optional(),
});
export type WebhookTriggerEvent = z.infer<typeof WebhookTriggerEventSchema>;

export const isWebhookTrigger = (trigger: { type?: string }): trigger is WebhookTrigger =>
  trigger.type === 'webhook';
