/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const RegisterWebhookInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .describe(
        'Webhook name in Datadog. Monitors notify it as @webhook-{name}. Example: "kibana-external-alerts"'
      ),
    url: z
      .string()
      .url()
      .describe(
        'Destination URL Datadog will POST to. For now a placeholder is fine (e.g. https://example.com/kibana/inbound/datadog).'
      ),
    customAuthHeader: z
      .string()
      .optional()
      .describe(
        'Optional Bearer token value sent as Authorization header on webhook POSTs. Leave empty to skip.'
      ),
  })
);

export const WebhookNameInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).describe('Datadog webhook integration name'),
  })
);

export const MuteMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z
      .number()
      .int()
      .positive()
      .describe('Datadog monitor ID to mute. Example: 309422658'),
    scope: z
      .string()
      .optional()
      .describe('Optional scope to mute (e.g. "host:web01"). Omit to mute all scopes.'),
    end: z
      .number()
      .int()
      .optional()
      .describe('Optional mute end time as Unix epoch seconds. Omit for indefinite mute.'),
  })
);

export const UnmuteMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z.number().int().positive().describe('Datadog monitor ID to unmute'),
  })
);

export const GetMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: z.number().int().positive().describe('Datadog monitor ID'),
  })
);

export const ListMonitorsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().optional().describe('Filter monitors by name substring'),
    tags: z
      .string()
      .optional()
      .describe('Comma-separated tags filter, e.g. "env:demo,monitoring-tier:datadog"'),
    groupStates: z
      .string()
      .optional()
      .describe('Comma-separated group states, e.g. "alert,warn". Example: "alert"'),
    page: z.number().int().min(0).optional().describe('Page number (0-based). Defaults to 0.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Results per page (1–1000). Defaults to 100.'),
  })
);

export type RegisterWebhookInput = z.infer<typeof RegisterWebhookInputSchema>;
export type WebhookNameInput = z.infer<typeof WebhookNameInputSchema>;
export type MuteMonitorInput = z.infer<typeof MuteMonitorInputSchema>;
export type UnmuteMonitorInput = z.infer<typeof UnmuteMonitorInputSchema>;
export type GetMonitorInput = z.infer<typeof GetMonitorInputSchema>;
export type ListMonitorsInput = z.infer<typeof ListMonitorsInputSchema>;

/** Payload template registered on Datadog webhooks — Keep-aligned fingerprint fields. */
export const DATADOG_WEBHOOK_PAYLOAD_TEMPLATE =
  '{ "monitor_id": "$ALERT_ID", "groups": "$ALERT_SCOPE", "title": "$ALERT_TITLE", "transition": "$ALERT_TRANSITION", "priority": "$ALERT_PRIORITY", "tags": "$TAGS", "link": "$LINK", "date": "$DATE", "org_id": "$ORG_ID" }';
