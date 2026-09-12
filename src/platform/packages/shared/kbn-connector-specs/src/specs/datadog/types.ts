/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const MAX_QUERY_LENGTH = 2000;
const MAX_TAG_LENGTH = 200;
const MAX_TAGS = 50;
const MAX_TITLE_LENGTH = 500;
const MAX_TEXT_LENGTH = 10000;
const MAX_ID_LENGTH = 128;
const MAX_SCOPE_LENGTH = 500;
const MAX_MONITOR_NAME_LENGTH = 500;

export const DATADOG_SITES = [
  'datadoghq.com',
  'us3.datadoghq.com',
  'us5.datadoghq.com',
  'datadoghq.eu',
  'ap1.datadoghq.com',
  'ap2.datadoghq.com',
  'uk1.datadoghq.com',
  'ddog-gov.com',
  'us2.ddog-gov.com',
] as const;

export type DatadogSite = (typeof DATADOG_SITES)[number];

/** Maps Datadog site parameter to the regional API base URL. */
export const DATADOG_SITE_API_URLS: Record<DatadogSite, string> = {
  'datadoghq.com': 'https://api.datadoghq.com',
  'us3.datadoghq.com': 'https://api.us3.datadoghq.com',
  'us5.datadoghq.com': 'https://api.us5.datadoghq.com',
  'datadoghq.eu': 'https://api.datadoghq.eu',
  'ap1.datadoghq.com': 'https://api.ap1.datadoghq.com',
  'ap2.datadoghq.com': 'https://api.ap2.datadoghq.com',
  'uk1.datadoghq.com': 'https://api.uk1.datadoghq.com',
  'ddog-gov.com': 'https://api.ddog-gov.com',
  'us2.ddog-gov.com': 'https://api.us2.ddog-gov.com',
};

const tagsSchema = z
  .array(z.string().min(1).max(MAX_TAG_LENGTH))
  .max(MAX_TAGS)
  .describe('Datadog tags, e.g. ["env:prod", "service:api"].');

export const ListMonitorsInputSchema = z.object({
  tags: tagsSchema
    .optional()
    .describe(
      'Filter by monitor tags (comma-joined server-side). Example: ["env:prod", "service:api"].'
    ),
  monitorTags: tagsSchema
    .optional()
    .describe(
      'Filter by tags applied to the monitor definition itself. Example: ["team:platform"].'
    ),
  name: z
    .string()
    .max(MAX_MONITOR_NAME_LENGTH)
    .optional()
    .describe('Substring filter on monitor name. Example: "CPU high".'),
  groupStates: z
    .array(z.enum(['alert', 'warn', 'no data', 'ok']))
    .max(4)
    .optional()
    .describe(
      'Restrict results to monitors whose groups are in these states. Example: ["alert", "warn"].'
    ),
  withDowntimes: z
    .boolean()
    .optional()
    .describe('When true, include active downtime info on each returned monitor.'),
  page: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe('Zero-based page index for pagination. Defaults to 0.'),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe("Number of monitors per page (1–1000). Defaults to Datadog's page size."),
});
export type ListMonitorsInput = z.infer<typeof ListMonitorsInputSchema>;

export const GetMonitorInputSchema = z.object({
  monitorId: z
    .number()
    .int()
    .positive()
    .describe('Numeric Datadog monitor ID, returned by listMonitors.'),
  groupStates: z
    .array(z.enum(['alert', 'warn', 'no data', 'ok']))
    .max(4)
    .optional()
    .describe('When set, only return group states matching these values.'),
});
export type GetMonitorInput = z.infer<typeof GetMonitorInputSchema>;

export const MuteMonitorInputSchema = z.object({
  monitorId: z
    .number()
    .int()
    .positive()
    .describe('Numeric Datadog monitor ID to mute, returned by listMonitors.'),
  scope: z
    .string()
    .max(MAX_SCOPE_LENGTH)
    .optional()
    .describe(
      'Optional mute scope, e.g. "host:i-12345" or "env:staging". Omit to mute the whole monitor.'
    ),
  end: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional Unix timestamp (seconds) when the mute ends. Omit for an indefinite mute until unmuted.'
    ),
});
export type MuteMonitorInput = z.infer<typeof MuteMonitorInputSchema>;

export const UnmuteMonitorInputSchema = z.object({
  monitorId: z
    .number()
    .int()
    .positive()
    .describe('Numeric Datadog monitor ID to unmute, returned by listMonitors.'),
  scope: z
    .string()
    .max(MAX_SCOPE_LENGTH)
    .optional()
    .describe('Optional scope to unmute, e.g. "host:i-12345". Omit to unmute the whole monitor.'),
  allScopes: z.boolean().optional().describe('When true, unmute every scoped mute on the monitor.'),
});
export type UnmuteMonitorInput = z.infer<typeof UnmuteMonitorInputSchema>;

export const GetAlertEventsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .describe(
      'Events search query. Prefixed with source:alert when omitted from the query text. Example: "source:alert status:error service:api" or "monitor_id:12345".'
    ),
  from: z
    .string()
    .min(1)
    .max(64)
    .describe(
      'Start of the time window as an ISO 8601 timestamp or relative time. Example: "2024-01-15T00:00:00Z" or "now-1h".'
    ),
  to: z
    .string()
    .min(1)
    .max(64)
    .describe(
      'End of the time window as an ISO 8601 timestamp or relative time. Example: "2024-01-15T12:00:00Z" or "now".'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of events to return (1–1000). Defaults to 50.'),
});
export type GetAlertEventsInput = z.infer<typeof GetAlertEventsInputSchema>;

export const ScheduleDowntimeInputSchema = z.object({
  scope: z
    .string()
    .min(1)
    .max(MAX_SCOPE_LENGTH)
    .describe(
      'Downtime scope expression. Example: "env:staging" or "host:web-01". Use "*" for all hosts.'
    ),
  start: z
    .string()
    .min(1)
    .max(64)
    .describe('Downtime start as an ISO 8601 timestamp. Example: "2024-06-01T10:00:00Z".'),
  end: z
    .string()
    .min(1)
    .max(64)
    .describe('Downtime end as an ISO 8601 timestamp. Example: "2024-06-01T12:00:00Z".'),
  message: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Optional message shown on muted notifications during the downtime.'),
  monitorTags: tagsSchema
    .optional()
    .describe(
      'Optional monitor tags that restrict which monitors the downtime applies to. Example: ["team:payments"]. Omit (or use ["*"]) to match all monitors in scope.'
    ),
  monitorId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Optional single monitor ID to target. When set, monitorTags is ignored and only this monitor is downtimed.'
    ),
});
export type ScheduleDowntimeInput = z.infer<typeof ScheduleDowntimeInputSchema>;

export const CancelDowntimeInputSchema = z.object({
  downtimeId: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .describe('Downtime ID returned by scheduleDowntime (UUID string from the v2 API).'),
});
export type CancelDowntimeInput = z.infer<typeof CancelDowntimeInputSchema>;

export const CreateIncidentInputSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(MAX_TITLE_LENGTH)
    .describe('Incident title shown in Datadog Incident Management.'),
  customerImpacted: z
    .boolean()
    .optional()
    .describe('Whether customers are impacted. Defaults to false.'),
  severity: z
    .enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4', 'SEV-5', 'UNKNOWN'])
    .optional()
    .describe('Incident severity. Example: "SEV-2". Defaults to Datadog\'s default when omitted.'),
  detectionMethod: z
    .enum(['customer', 'employee', 'monitor', 'other', 'unknown'])
    .optional()
    .describe('How the incident was detected. Example: "monitor".'),
  initialCell: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .optional()
    .describe('Optional initial timeline note / markdown content for the incident.'),
});
export type CreateIncidentInput = z.infer<typeof CreateIncidentInputSchema>;

export const UpdateIncidentInputSchema = z
  .object({
    incidentId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('Incident UUID returned by createIncident.'),
    title: z.string().min(1).max(MAX_TITLE_LENGTH).optional().describe('Updated incident title.'),
    customerImpacted: z.boolean().optional().describe('Updated customer-impacted flag.'),
    severity: z
      .enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4', 'SEV-5', 'UNKNOWN'])
      .optional()
      .describe('Updated severity. Example: "SEV-1".'),
    state: z
      .enum(['active', 'stable', 'resolved'])
      .optional()
      .describe('Updated incident state. Use "resolved" to close the incident.'),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.customerImpacted !== undefined ||
      value.severity !== undefined ||
      value.state !== undefined,
    {
      message: 'Provide at least one field to update: title, customerImpacted, severity, or state.',
    }
  );
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;

export const PostEventInputSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(MAX_TITLE_LENGTH)
    .describe('Event title shown in the Datadog Events Explorer.'),
  text: z.string().min(1).max(MAX_TEXT_LENGTH).describe('Event body text. Supports markdown.'),
  tags: tagsSchema
    .optional()
    .describe('Optional tags for the event. Example: ["env:prod", "source:kibana"].'),
  alertType: z
    .enum(['error', 'warning', 'info', 'success', 'user_update', 'recommendation', 'snapshot'])
    .optional()
    .describe('Event alert type that controls the icon/color. Defaults to "info".'),
  aggregationKey: z
    .string()
    .max(200)
    .optional()
    .describe('Optional key used to aggregate related events in the stream.'),
  dateHappened: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Optional Unix timestamp (seconds) for when the event occurred. Defaults to now.'),
});
export type PostEventInput = z.infer<typeof PostEventInputSchema>;

export const QueryTimeseriesInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .describe('Datadog metric query. Example: "avg:system.cpu.user{env:prod} by {host}".'),
  from: z.number().int().describe('Start of the query window as a Unix timestamp in seconds.'),
  to: z.number().int().describe('End of the query window as a Unix timestamp in seconds.'),
});
export type QueryTimeseriesInput = z.infer<typeof QueryTimeseriesInputSchema>;

export const SearchLogsInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(MAX_QUERY_LENGTH)
    .describe(
      'Log search query using Datadog log query syntax. Example: "service:api status:error".'
    ),
  from: z
    .string()
    .min(1)
    .max(64)
    .describe(
      'Start of the time window as an ISO 8601 timestamp. Example: "2024-01-15T00:00:00Z".'
    ),
  to: z
    .string()
    .min(1)
    .max(64)
    .describe('End of the time window as an ISO 8601 timestamp. Example: "2024-01-15T01:00:00Z".'),
  indexes: z
    .array(z.string().min(1).max(200))
    .max(20)
    .optional()
    .describe('Optional log indexes to search. Example: ["main"]. Defaults to all indexes.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Maximum number of log events to return (1–1000). Defaults to 50.'),
  sort: z
    .enum(['timestamp', '-timestamp'])
    .optional()
    .describe(
      'Sort order. Use "-timestamp" for newest first (default) or "timestamp" for oldest first.'
    ),
  storageTier: z
    .enum(['indexes', 'online-archives', 'flex'])
    .optional()
    .describe('Storage tier to search. Defaults to "indexes".'),
});
export type SearchLogsInput = z.infer<typeof SearchLogsInputSchema>;
