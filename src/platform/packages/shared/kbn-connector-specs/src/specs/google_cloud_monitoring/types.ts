/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// A bare resource ID (as returned by list operations) or a full resource name.
// Restricting the character set (no "/", "?", "#", or whitespace) also protects
// the URL path segments these values are interpolated into. Each segment also
// rejects dot-only values (".", "..") via the negative lookaheads below, since
// those pass the character-class check but are normalized as path traversal
// once interpolated into the request URL.
const RESOURCE_ID_OR_NAME =
  /^(?!\.+$)[A-Za-z0-9_.-]+$|^projects\/(?!\.+\/)[A-Za-z0-9_.-]+\/(?!\.+\/)[A-Za-z0-9_.-]+\/(?!\.+$)[A-Za-z0-9_.-]+$/;

const PROJECT_ID_DESCRIPTION =
  "GCP project ID to use for this call. Defaults to the connector's configured project ID; only set this to target a different project.";

const projectIdOverride = () =>
  z
    .string()
    .min(1)
    .max(63)
    .regex(/^[A-Za-z0-9-]+$/)
    .optional()
    .describe(PROJECT_ID_DESCRIPTION);

const pageSize = (max: number, def: number) =>
  z
    .number()
    .int()
    .min(1)
    .max(max)
    .optional()
    .describe(`Maximum number of results to return (1-${max}). Defaults to ${def}.`);

const pageToken = () =>
  z.string().max(2000).optional().describe('Pagination token from a previous response.');

export const ALIGNER_VALUES = [
  'ALIGN_NONE',
  'ALIGN_DELTA',
  'ALIGN_RATE',
  'ALIGN_INTERPOLATE',
  'ALIGN_NEXT_OLDER',
  'ALIGN_MIN',
  'ALIGN_MAX',
  'ALIGN_MEAN',
  'ALIGN_COUNT',
  'ALIGN_SUM',
  'ALIGN_STDDEV',
  'ALIGN_COUNT_TRUE',
  'ALIGN_COUNT_FALSE',
  'ALIGN_FRACTION_TRUE',
  'ALIGN_PERCENTILE_99',
  'ALIGN_PERCENTILE_95',
  'ALIGN_PERCENTILE_50',
  'ALIGN_PERCENTILE_05',
  'ALIGN_PERCENT_CHANGE',
] as const;

export const REDUCER_VALUES = [
  'REDUCE_NONE',
  'REDUCE_MEAN',
  'REDUCE_MIN',
  'REDUCE_MAX',
  'REDUCE_SUM',
  'REDUCE_STDDEV',
  'REDUCE_COUNT',
  'REDUCE_COUNT_TRUE',
  'REDUCE_COUNT_FALSE',
  'REDUCE_FRACTION_TRUE',
  'REDUCE_PERCENTILE_99',
  'REDUCE_PERCENTILE_95',
  'REDUCE_PERCENTILE_50',
  'REDUCE_PERCENTILE_05',
] as const;

export const ListAlertPoliciesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Filter expression restricting which alert policies are returned, e.g. \'display_name starts_with "Prod"\'. See Cloud Monitoring filter syntax.'
      ),
    orderBy: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Comma-separated fields to sort by, e.g. "displayName". Prefix with "-" for descending.'
      ),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListAlertPoliciesInput = z.infer<typeof ListAlertPoliciesInputSchema>;

export const GetAlertPolicyInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    policyName: z
      .string()
      .min(1)
      .max(300)
      .regex(
        RESOURCE_ID_OR_NAME,
        'Must be a bare alert policy ID or "projects/{project}/alertPolicies/{id}".'
      )
      .describe(
        'The alert policy to retrieve. Pass the bare alert policy ID, or the full resource name "projects/{project}/alertPolicies/{id}", both returned by listAlertPolicies.'
      ),
  })
);
export type GetAlertPolicyInput = z.infer<typeof GetAlertPolicyInputSchema>;

export const SetAlertPolicyEnabledInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    policyName: z
      .string()
      .min(1)
      .max(300)
      .regex(
        RESOURCE_ID_OR_NAME,
        'Must be a bare alert policy ID or "projects/{project}/alertPolicies/{id}".'
      )
      .describe(
        'The alert policy to mute or unmute. Pass the bare alert policy ID, or the full resource name "projects/{project}/alertPolicies/{id}", both returned by listAlertPolicies.'
      ),
    enabled: z
      .boolean()
      .describe(
        'Set to false to stop the policy from opening new incidents (mute it); set to true to resume normal alerting (unmute it).'
      ),
  })
);
export type SetAlertPolicyEnabledInput = z.infer<typeof SetAlertPolicyEnabledInputSchema>;

export const UpdateAlertPolicyInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectIdOverride(),
      policyName: z
        .string()
        .min(1)
        .max(300)
        .regex(
          RESOURCE_ID_OR_NAME,
          'Must be a bare alert policy ID or "projects/{project}/alertPolicies/{id}".'
        )
        .describe(
          'The alert policy to update. Pass the bare alert policy ID, or the full resource name "projects/{project}/alertPolicies/{id}", both returned by listAlertPolicies.'
        ),
      displayName: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe(
          'New display name for the policy shown in dashboards, notifications, and incidents.'
        ),
      documentationContent: z
        .string()
        .min(1)
        .max(8192)
        .optional()
        .describe(
          'New Markdown documentation body included with notifications and incidents (helps responders triage). Replaces the existing documentation content.'
        ),
      documentationSubject: z
        .string()
        .min(1)
        .max(2000)
        .optional()
        .describe('New subject line for notifications generated by this policy.'),
      notificationChannels: z
        .array(
          z
            .string()
            .min(1)
            .max(300)
            .regex(
              RESOURCE_ID_OR_NAME,
              'Must be a bare notification channel ID or "projects/{project}/notificationChannels/{id}".'
            )
        )
        .max(50)
        .optional()
        .describe(
          'Replaces the full set of notification channels for this policy. Pass bare channel IDs or full resource names returned by listNotificationChannels — this list is not merged with the existing channels.'
        ),
      combiner: z
        .enum(['AND', 'OR', 'AND_WITH_MATCHING_RESOURCE'])
        .optional()
        .describe('How multiple conditions are combined to decide whether to open an incident.'),
      conditions: z
        .array(
          z
            .record(z.string().max(200), z.unknown())
            .refine((condition) => Object.keys(condition).length <= 30, {
              message: 'A condition object supports at most 30 top-level fields.',
            })
        )
        .max(6)
        .optional()
        .describe(
          'Replaces the full set of conditions for this policy (a policy can have 1-6). Each entry must be a Cloud Monitoring Condition object — copy and modify the "conditions" array returned by getAlertPolicy for this same policy rather than constructing one from scratch, since threshold/comparison shapes vary by condition type. This list is not merged with the existing conditions; omitted existing conditions are deleted.'
        ),
      userLabels: z
        .record(z.string().max(63), z.string().max(128))
        .refine((labels) => Object.keys(labels).length <= 64, {
          message: 'userLabels supports at most 64 entries.',
        })
        .optional()
        .describe(
          'Replaces the full set of user labels on the policy (up to 64 entries). Keys and values may contain only lowercase letters, numerals, underscores, and dashes.'
        ),
    })
    .refine(
      (data) =>
        data.displayName !== undefined ||
        data.documentationContent !== undefined ||
        data.documentationSubject !== undefined ||
        data.notificationChannels !== undefined ||
        data.combiner !== undefined ||
        data.conditions !== undefined ||
        data.userLabels !== undefined,
      {
        message:
          'Provide at least one field to update: displayName, documentationContent, documentationSubject, notificationChannels, combiner, conditions, or userLabels.',
      }
    )
);
export type UpdateAlertPolicyInput = z.infer<typeof UpdateAlertPolicyInputSchema>;

export const CreateSnoozeInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectIdOverride(),
      displayName: z
        .string()
        .min(1)
        .max(512)
        .describe('Human-readable name for the snooze, e.g. "DB maintenance window".'),
      startTime: z
        .string()
        .min(1)
        .max(40)
        .describe(
          'RFC 3339 / ISO 8601 timestamp when the snooze becomes active, e.g. "2024-01-15T00:00:00Z". Cannot be in the past.'
        ),
      endTime: z
        .string()
        .min(1)
        .max(40)
        .describe(
          'RFC 3339 / ISO 8601 timestamp when the snooze ends, e.g. "2024-01-15T02:00:00Z".'
        ),
      policyNames: z
        .array(
          z
            .string()
            .min(1)
            .max(300)
            .regex(
              RESOURCE_ID_OR_NAME,
              'Must be a bare alert policy ID or "projects/{project}/alertPolicies/{id}".'
            )
        )
        .max(16)
        .optional()
        .describe(
          'Alert policies this snooze applies to (up to 16). Pass bare alert policy IDs or full resource names returned by listAlertPolicies. Exactly one policy is required when filter is also set.'
        ),
      filter: z
        .string()
        .max(2000)
        .optional()
        .describe(
          'Optional label filter restricting the snooze to matching incidents within the single alert policy given in policyNames, e.g. \'resource.labels.instance_id="1234567890"\'. Requires exactly one entry in policyNames.'
        ),
    })
    .refine((data) => (data.policyNames && data.policyNames.length > 0) || data.filter, {
      message: 'Provide at least one of policyNames or filter.',
    })
    .refine((data) => !data.filter || (data.policyNames && data.policyNames.length === 1), {
      message: 'Exactly one policyName is required when filter is specified.',
    })
);
export type CreateSnoozeInput = z.infer<typeof CreateSnoozeInputSchema>;

export const ListSnoozesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Optional filter restricting results by interval.start_time / interval.end_time, e.g. \'interval.start_time > "2024-01-01T00:00:00Z"\'.'
      ),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListSnoozesInput = z.infer<typeof ListSnoozesInputSchema>;

export const UpdateSnoozeInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectIdOverride(),
      snoozeName: z
        .string()
        .min(1)
        .max(300)
        .regex(
          RESOURCE_ID_OR_NAME,
          'Must be a bare snooze ID or "projects/{project}/snoozes/{id}".'
        )
        .describe(
          'The snooze to update. Pass the bare snooze ID, or the full resource name "projects/{project}/snoozes/{id}", both returned by listSnoozes or createSnooze.'
        ),
      displayName: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe('New display name for the snooze.'),
      startTime: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(
          'New RFC 3339 / ISO 8601 start time. Only updatable before the current start time is reached.'
        ),
      endTime: z
        .string()
        .min(1)
        .max(40)
        .optional()
        .describe(
          'New RFC 3339 / ISO 8601 end time. Set this to a time in the past to end an active snooze early, or to a later time to extend it.'
        ),
    })
    .refine(
      (data) =>
        data.displayName !== undefined ||
        data.startTime !== undefined ||
        data.endTime !== undefined,
      { message: 'Provide at least one field to update: displayName, startTime, or endTime.' }
    )
);
export type UpdateSnoozeInput = z.infer<typeof UpdateSnoozeInputSchema>;

export const ListNotificationChannelsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Filter expression restricting which notification channels are returned, e.g. \'type="email"\'.'
      ),
    orderBy: z
      .string()
      .max(200)
      .optional()
      .describe('Comma-separated fields to sort by. Prefix with "-" for descending.'),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListNotificationChannelsInput = z.infer<typeof ListNotificationChannelsInputSchema>;

export const ListTimeSeriesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Required monitoring filter naming a single metric type, e.g. \'metric.type="compute.googleapis.com/instance/cpu/usage_time" AND resource.labels.instance_id="123"\'. Copy the filter from the alert condition being triaged when possible.'
      ),
    startTime: z
      .string()
      .min(1)
      .max(40)
      .describe(
        'RFC 3339 / ISO 8601 start of the time interval to return (exclusive), e.g. "2024-01-15T00:00:00Z".'
      ),
    endTime: z
      .string()
      .min(1)
      .max(40)
      .describe(
        'RFC 3339 / ISO 8601 end of the time interval to return (inclusive), e.g. "2024-01-15T01:00:00Z".'
      ),
    alignmentPeriod: z
      .string()
      .max(20)
      .optional()
      .describe(
        'Duration string dividing the interval into alignment periods before applying perSeriesAligner, e.g. "60s" or "3600s". Required (>= 60s) whenever perSeriesAligner is not "ALIGN_NONE".'
      ),
    perSeriesAligner: z
      .enum(ALIGNER_VALUES)
      .optional()
      .describe(
        'How to reduce the points within each alignment period of a single time series, e.g. "ALIGN_MEAN" or "ALIGN_MAX". Required if crossSeriesReducer is set.'
      ),
    crossSeriesReducer: z
      .enum(REDUCER_VALUES)
      .optional()
      .describe(
        'How to combine multiple aligned time series into one, e.g. "REDUCE_SUM" or "REDUCE_MEAN". Requires perSeriesAligner (not "ALIGN_NONE") and alignmentPeriod to also be set.'
      ),
    groupByFields: z
      .array(z.string().min(1).max(200))
      .max(20)
      .optional()
      .describe(
        'Resource/metric label fields to preserve when crossSeriesReducer is set, e.g. ["resource.label.zone"]. Time series sharing the same values for these fields are reduced together.'
      ),
    view: z
      .enum(['FULL', 'HEADERS'])
      .optional()
      .describe(
        'Amount of data to return per time series: "FULL" includes points, "HEADERS" returns only metadata (faster for a quick inventory of matching series). Defaults to "FULL".'
      ),
    pageSize: pageSize(1000, 100),
    pageToken: pageToken(),
  })
);
export type ListTimeSeriesInput = z.infer<typeof ListTimeSeriesInputSchema>;

export const ListUptimeCheckConfigsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe('Filter expression restricting which Uptime check configurations are returned.'),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListUptimeCheckConfigsInput = z.infer<typeof ListUptimeCheckConfigsInputSchema>;

export const ListServicesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Filter expression restricting which services are returned, e.g. \'identifier_case = "CUSTOM"\'.'
      ),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListServicesInput = z.infer<typeof ListServicesInputSchema>;

export const ListServiceLevelObjectivesInputSchema = lazySchema(() =>
  z.object({
    projectId: projectIdOverride(),
    serviceId: z
      .string()
      .min(1)
      .max(200)
      .regex(
        /^(?!\.+$)[A-Za-z0-9_.-]+$/,
        'Must be a bare service ID, e.g. the last path segment of a service name.'
      )
      .describe(
        'The service to list SLOs for. Use the ID from a service name returned by listServices.'
      ),
    filter: z
      .string()
      .max(2000)
      .optional()
      .describe('Filter expression restricting which SLOs are returned.'),
    view: z
      .enum(['DEFAULT', 'EXPLICIT'])
      .optional()
      .describe(
        'Use "EXPLICIT" to expand basic SLIs into their full request-based definition; "DEFAULT" returns each SLO as originally defined.'
      ),
    pageSize: pageSize(1000, 50),
    pageToken: pageToken(),
  })
);
export type ListServiceLevelObjectivesInput = z.infer<typeof ListServiceLevelObjectivesInputSchema>;
