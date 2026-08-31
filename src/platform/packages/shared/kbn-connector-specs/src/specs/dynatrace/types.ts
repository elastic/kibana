/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_LABEL_ENTRIES = 50;

const eventPropertiesSchema = z
  .record(z.string().max(100), z.string().max(4096))
  .refine((props) => Object.keys(props).length <= MAX_LABEL_ENTRIES, {
    message: `At most ${MAX_LABEL_ENTRIES} event properties are allowed.`,
  })
  .describe(
    'Map of event properties (max 50 entries). Use dt.event.* / dt.davis.* for classic behavior, dt.entity.* to attach entities, or any non-dt.* key for custom metadata.'
  );

export const DynatraceListProblemsInputSchema = lazySchema(() =>
  z.object({
    problemSelector: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Dynatrace problem selector, e.g. status("OPEN"), severityLevel("AVAILABILITY"), or managementZoneIds("123"). Separate criteria with commas (AND).'
      ),
    entitySelector: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Restrict to problems affecting these entities, e.g. type("SERVICE"),entityName.equals("Checkout").'
      ),
    from: z
      .string()
      .max(40)
      .optional()
      .describe(
        'Start of the timeframe (ISO 8601 or relative like "now-2h"). Defaults to the last 2 hours if both from and to are omitted.'
      ),
    to: z
      .string()
      .max(40)
      .optional()
      .describe('End of the timeframe (ISO 8601 or relative like "now"). Defaults to now.'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Comma-separated extra fields to include, e.g. "evidenceDetails,recentComments,impactAnalysis".'
      ),
    sort: z
      .string()
      .max(100)
      .optional()
      .describe(
        'Sort order, e.g. "status", "-startTime", or "relevance" (use with text search in problemSelector).'
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of problems per page (1-500). Defaults to 50.'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listProblems response.'),
  })
);
export type DynatraceListProblemsInput = z.infer<typeof DynatraceListProblemsInputSchema>;

export const DynatraceGetProblemInputSchema = lazySchema(() =>
  z.object({
    problemId: z
      .string()
      .min(1)
      .max(200)
      .describe('Dynatrace problem ID, e.g. "-5125468176648254814_1684144800000V2".'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Comma-separated extra fields, e.g. "evidenceDetails,recentComments,impactAnalysis".'
      ),
  })
);
export type DynatraceGetProblemInput = z.infer<typeof DynatraceGetProblemInputSchema>;

export const DynatraceCloseProblemInputSchema = lazySchema(() =>
  z.object({
    problemId: z.string().min(1).max(200).describe('ID of the problem to close.'),
    message: z
      .string()
      .min(1)
      .max(5000)
      .describe('Closing comment recorded on the problem, e.g. "Remediated by workflow XYZ".'),
  })
);
export type DynatraceCloseProblemInput = z.infer<typeof DynatraceCloseProblemInputSchema>;

export const DynatraceAddProblemCommentInputSchema = lazySchema(() =>
  z.object({
    problemId: z.string().min(1).max(200).describe('ID of the problem to comment on.'),
    message: z.string().min(1).max(5000).describe('Comment text to post on the problem.'),
    context: z
      .string()
      .max(500)
      .optional()
      .describe('Optional context string stored with the comment (e.g. workflow name or run ID).'),
  })
);
export type DynatraceAddProblemCommentInput = z.infer<typeof DynatraceAddProblemCommentInputSchema>;

export const DynatraceListProblemCommentsInputSchema = lazySchema(() =>
  z.object({
    problemId: z.string().min(1).max(200).describe('ID of the problem whose comments to list.'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of comments per page (1-500).'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listProblemComments response.'),
  })
);
export type DynatraceListProblemCommentsInput = z.infer<
  typeof DynatraceListProblemCommentsInputSchema
>;

export const DynatraceIngestEventInputSchema = lazySchema(() =>
  z.object({
    eventType: z
      .enum([
        'AVAILABILITY_EVENT',
        'CUSTOM_ALERT',
        'CUSTOM_ANNOTATION',
        'CUSTOM_CONFIGURATION',
        'CUSTOM_DEPLOYMENT',
        'CUSTOM_INFO',
        'ERROR_EVENT',
        'MARKED_FOR_TERMINATION',
        'PERFORMANCE_EVENT',
        'RESOURCE_CONTENTION_EVENT',
        'WARNING',
      ])
      .describe(
        'Dynatrace event type. Use CUSTOM_ANNOTATION / CUSTOM_DEPLOYMENT / CUSTOM_INFO for workflow markers; ERROR_EVENT / AVAILABILITY_EVENT can open problems.'
      ),
    title: z.string().min(1).max(500).describe('Event title shown in Dynatrace.'),
    entitySelector: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Entity selector for targets, e.g. type(HOST),entityId("HOST-ABC") or type(SERVICE),entityName.equals("Checkout"). Defaults to the environment entity.'
      ),
    properties: eventPropertiesSchema.optional(),
    startTime: z
      .number()
      .int()
      .optional()
      .describe('Event start time in UTC milliseconds. Defaults to now.'),
    endTime: z.number().int().optional().describe('Event end time in UTC milliseconds.'),
    timeout: z
      .number()
      .int()
      .min(1)
      .max(360)
      .optional()
      .describe('Event timeout in minutes (1-360). Defaults to 15.'),
  })
);
export type DynatraceIngestEventInput = z.infer<typeof DynatraceIngestEventInputSchema>;

export const DynatraceListEventsInputSchema = lazySchema(() =>
  z.object({
    eventSelector: z
      .string()
      .max(2000)
      .optional()
      .describe('Dynatrace event selector, e.g. eventType("CUSTOM_DEPLOYMENT") or status("OPEN").'),
    entitySelector: z
      .string()
      .max(2000)
      .optional()
      .describe('Restrict to events on these entities.'),
    from: z
      .string()
      .max(40)
      .optional()
      .describe('Start of the timeframe (ISO 8601 or relative like "now-2h").'),
    to: z
      .string()
      .max(40)
      .optional()
      .describe('End of the timeframe (ISO 8601 or relative like "now").'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Number of events per page (1-1000).'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listEvents response.'),
  })
);
export type DynatraceListEventsInput = z.infer<typeof DynatraceListEventsInputSchema>;

export const DynatraceGetEventInputSchema = lazySchema(() =>
  z.object({
    eventId: z.string().min(1).max(200).describe('Dynatrace event ID to retrieve.'),
  })
);
export type DynatraceGetEventInput = z.infer<typeof DynatraceGetEventInputSchema>;

export const DynatraceQueryMetricsInputSchema = lazySchema(() =>
  z.object({
    metricSelector: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Metric selector expression, e.g. "builtin:host.cpu.usage:avg" or a more complex transformation.'
      ),
    from: z
      .string()
      .max(40)
      .optional()
      .describe('Start of the query window (ISO 8601 or relative like "now-1h").'),
    to: z
      .string()
      .max(40)
      .optional()
      .describe('End of the query window (ISO 8601 or relative like "now").'),
    resolution: z
      .string()
      .max(40)
      .optional()
      .describe('Desired resolution, e.g. "1m", "5m", or "Inf" for a single aggregate.'),
    entitySelector: z
      .string()
      .max(2000)
      .optional()
      .describe('Optional entity selector to scope the metric query.'),
  })
);
export type DynatraceQueryMetricsInput = z.infer<typeof DynatraceQueryMetricsInputSchema>;

export const DynatraceListMetricsInputSchema = lazySchema(() =>
  z.object({
    metricSelector: z
      .string()
      .max(2000)
      .optional()
      .describe('Filter metrics by selector, e.g. "builtin:host.*" or "builtin:*".'),
    text: z
      .string()
      .max(200)
      .optional()
      .describe('Free-text search across metric keys and display names.'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe('Comma-separated fields to include, e.g. "unit,aggregationTypes,description".'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of metrics per page (1-500).'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listMetrics response.'),
  })
);
export type DynatraceListMetricsInput = z.infer<typeof DynatraceListMetricsInputSchema>;

export const DynatraceGetMetricDescriptorInputSchema = lazySchema(() =>
  z.object({
    metricId: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Metric key / ID, e.g. "builtin:host.cpu.usage". Colons and other reserved characters are URL-encoded automatically.'
      ),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe('Comma-separated fields to include in the descriptor response.'),
  })
);
export type DynatraceGetMetricDescriptorInput = z.infer<
  typeof DynatraceGetMetricDescriptorInputSchema
>;

export const DynatraceListEntitiesInputSchema = lazySchema(() =>
  z.object({
    entitySelector: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Required entity selector, e.g. type("HOST"), type("SERVICE"),entityName.contains("api"), or entityId("HOST-ABC").'
      ),
    from: z
      .string()
      .max(40)
      .optional()
      .describe('Only include entities seen after this time (ISO 8601 or relative).'),
    to: z
      .string()
      .max(40)
      .optional()
      .describe('Only include entities seen before this time (ISO 8601 or relative).'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Comma-separated fields, e.g. "lastSeenTms,properties,tags,fromRelationships,toRelationships".'
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of entities per page (1-500).'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listEntities response.'),
  })
);
export type DynatraceListEntitiesInput = z.infer<typeof DynatraceListEntitiesInputSchema>;

export const DynatraceGetEntityInputSchema = lazySchema(() =>
  z.object({
    entityId: z
      .string()
      .min(1)
      .max(200)
      .describe('Dynatrace entity ID, e.g. "HOST-ABCDEF1234567890" or "SERVICE-XYZ".'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Comma-separated fields, e.g. "properties,tags,fromRelationships,toRelationships".'
      ),
    from: z.string().max(40).optional().describe('Start of the observation window.'),
    to: z.string().max(40).optional().describe('End of the observation window.'),
  })
);
export type DynatraceGetEntityInput = z.infer<typeof DynatraceGetEntityInputSchema>;

export const DynatraceCreateMaintenanceWindowInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Display name of the maintenance window.'),
    filter: z
      .string()
      .min(1)
      .max(5000)
      .describe(
        'DQL filter selecting the entities/scope for the window (Settings schema builtin:maintenance-windows). Example: a DQL expression matching the hosts or services under maintenance.'
      ),
    startDateTime: z
      .string()
      .min(1)
      .max(40)
      .describe(
        'Local date-time when the once-off window starts, e.g. "2026-07-30T14:00:00" (no timezone offset; pair with schedule timezone if needed).'
      ),
    durationMinutes: z
      .number()
      .int()
      .min(1)
      .max(10080)
      .describe('Duration of the maintenance window in minutes (1 to 10080 = 7 days).'),
    description: z
      .string()
      .max(2000)
      .optional()
      .describe('Optional description shown in the Dynatrace UI.'),
    enabled: z.boolean().optional().describe('Whether the window is enabled. Defaults to true.'),
    autoDelete: z
      .boolean()
      .optional()
      .describe(
        'When true, Dynatrace auto-deletes the configuration 30 days after the last execution. Defaults to true.'
      ),
    timezone: z
      .string()
      .max(100)
      .optional()
      .describe('IANA timezone for the schedule, e.g. "UTC" or "Europe/Berlin".'),
  })
);
export type DynatraceCreateMaintenanceWindowInput = z.infer<
  typeof DynatraceCreateMaintenanceWindowInputSchema
>;

export const DynatraceListMaintenanceWindowsInputSchema = lazySchema(() =>
  z.object({
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe('Number of settings objects per page (1-500).'),
    nextPageKey: z
      .string()
      .max(500)
      .optional()
      .describe('Pagination cursor from a previous listMaintenanceWindows response.'),
    fields: z
      .string()
      .max(500)
      .optional()
      .describe('Optional fields selector for the Settings objects response.'),
  })
);
export type DynatraceListMaintenanceWindowsInput = z.infer<
  typeof DynatraceListMaintenanceWindowsInputSchema
>;

export const DynatraceDeleteMaintenanceWindowInputSchema = lazySchema(() =>
  z.object({
    objectId: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Settings object ID of the maintenance window to delete (returned by createMaintenanceWindow / listMaintenanceWindows).'
      ),
  })
);
export type DynatraceDeleteMaintenanceWindowInput = z.infer<
  typeof DynatraceDeleteMaintenanceWindowInputSchema
>;
