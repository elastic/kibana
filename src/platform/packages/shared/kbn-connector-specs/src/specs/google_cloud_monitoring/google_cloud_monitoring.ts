/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Google Cloud Monitoring Connector
 *
 * Gives agents and workflows the primitives to locate, suppress, and enrich GCP
 * alerts over the Cloud Monitoring API v3: alert-policy reads, the policy
 * `enabled` flag, the snooze lifecycle, notification-channel lookup, and metric,
 * uptime, and SLO enrichment reads.
 *
 * Cloud Monitoring API v3 has no incidents REST resource, so the lifecycle this
 * connector drives is the `enabled` flag on an AlertPolicy plus Snoozes, not an
 * acknowledge-incident call.
 *
 * Authentication uses a GCP service account JSON key (shared `gcp_service_account`
 * auth type), which the platform exchanges for a short-lived OAuth access token on
 * every call — see auth_types/gcp_service_account.ts.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  ListAlertPoliciesInputSchema,
  GetAlertPolicyInputSchema,
  SetAlertPolicyEnabledInputSchema,
  UpdateAlertPolicyInputSchema,
  CreateSnoozeInputSchema,
  ListSnoozesInputSchema,
  UpdateSnoozeInputSchema,
  ListNotificationChannelsInputSchema,
  ListTimeSeriesInputSchema,
  ListUptimeCheckConfigsInputSchema,
  ListServicesInputSchema,
  ListServiceLevelObjectivesInputSchema,
} from './types';
import type {
  ListAlertPoliciesInput,
  GetAlertPolicyInput,
  SetAlertPolicyEnabledInput,
  UpdateAlertPolicyInput,
  CreateSnoozeInput,
  ListSnoozesInput,
  UpdateSnoozeInput,
  ListNotificationChannelsInput,
  ListTimeSeriesInput,
  ListUptimeCheckConfigsInput,
  ListServicesInput,
  ListServiceLevelObjectivesInput,
} from './types';

const MONITORING_API_BASE = 'https://monitoring.googleapis.com/v3';

// Matches a full "projects/{p}/{collection}/{id}" name, mirroring the character-set
// restriction already enforced by the Zod input schemas — including the negative
// lookaheads that reject a dot-only segment (".", "..") so a value that passes this
// regex can't produce a path-traversing URL once interpolated below.
const FULL_NAME_REGEX =
  /^projects\/(?!\.+\/)([A-Za-z0-9_.-]+)\/(?!\.+\/)([A-Za-z0-9_.-]+)\/(?!\.+$)([A-Za-z0-9_.-]+)$/;

/**
 * Encodes a single dynamic URL path segment, rejecting a segment that consists
 * solely of dots (".", "..", ...). Such a segment passes the `[A-Za-z0-9_.-]+`
 * character-class check but is not neutralized by `encodeURIComponent` (dots are
 * unreserved), so it would otherwise reach the request URL as literal ".."/"."
 * and risk path traversal once the URL is parsed/normalized downstream. This is
 * defense in depth on top of the input schemas' own dot-only-segment rejection,
 * for any value that reaches this helper from a source other than a validated
 * Zod schema.
 */
function encodeResourceSegment(segment: string): string {
  if (/^\.+$/.test(segment)) {
    throw new Error(`Invalid resource path segment: "${segment}".`);
  }
  return encodeURIComponent(segment);
}

function getDefaultProjectId(ctx: ActionContext): string {
  const config = ctx.config as { projectId?: string } | undefined;
  const projectId = config?.projectId;
  if (!projectId) {
    throw new Error('Connector is missing the required projectId configuration field.');
  }
  return projectId;
}

function resolveProjectId(ctx: ActionContext, override?: string): string {
  return override || getDefaultProjectId(ctx);
}

/**
 * Resolves a bare resource ID or full resource name into a full, URL-safe resource
 * name of the form `projects/{project}/{collection}/{id}`. Every dynamic segment is
 * passed through encodeURIComponent even though the input schema already restricts
 * the character set, as defense in depth against any value reaching this helper
 * from a source other than a validated Zod schema.
 */
function resolveResourceName(value: string, collection: string, defaultProjectId: string): string {
  const match = value.match(FULL_NAME_REGEX);
  if (match) {
    const [, projectId, matchedCollection, id] = match;
    return `projects/${encodeResourceSegment(
      projectId
    )}/${matchedCollection}/${encodeResourceSegment(id)}`;
  }
  return `projects/${encodeURIComponent(defaultProjectId)}/${collection}/${encodeResourceSegment(
    value
  )}`;
}

function throwMonitoringError(error: unknown): never {
  const err = error as {
    response?: {
      status?: number;
      statusText?: string;
      data?: { error?: { message?: string; code?: number; status?: string } } | string;
    };
    message?: string;
  };

  const responseData = err.response?.data;
  const gcpError = typeof responseData === 'object' ? responseData?.error : undefined;
  if (gcpError) {
    throw new Error(
      `Cloud Monitoring API error [${gcpError.status || gcpError.code}]: ${gcpError.message}`
    );
  }

  const rawBody = typeof responseData === 'string' ? responseData : '';
  const detail = rawBody ? ` — ${rawBody}` : '';
  const status = err.response?.status;

  if (status === 401) {
    throw new Error(`Authentication failed (401)${detail}`);
  }
  if (status === 403) {
    throw new Error(`Access denied (403)${detail}`);
  }
  throw new Error(
    `Cloud Monitoring API request failed: ${
      err.response?.statusText || err.message || 'Unknown error'
    }${detail}`
  );
}

export const GoogleCloudMonitoring: ConnectorSpec = {
  metadata: {
    id: '.google_cloud_monitoring',
    displayName: 'Google Cloud Monitoring',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.googleCloudMonitoring.metadata.description',
      {
        defaultMessage:
          'Find, mute, and snooze GCP alerting policies, and enrich alerts with metric, uptime, and SLO data',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // A new connector type must reach Production-NonCanary before it can declare
    // user-facing features. Ship ['agentBuilder'] first, then add 'workflows'
    // and others in a follow-up PR once this connector is registered in every
    // Production-NonCanary version.
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  schema: lazySchema(() =>
    z.object({
      projectId: z
        .string()
        .min(1)
        .max(63)
        .regex(/^[A-Za-z0-9-]+$/, 'Must be a valid GCP project ID or project number.')
        .describe(
          'Default GCP project ID whose alerting policies, snoozes, and metrics this connector manages.'
        )
        .meta({
          widget: 'text',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.googleCloudMonitoring.config.projectId.label',
            {
              defaultMessage: 'GCP Project ID',
            }
          ),
          placeholder: 'my-gcp-project',
        }),
    })
  ),

  actions: {
    listAlertPolicies: {
      isTool: true,
      description:
        'List Cloud Monitoring alerting policies in the project, optionally filtered. This is the starting point for triaging a fired alert or for locating a policy to mute or snooze — use getAlertPolicy on a result to see its full conditions, enabled state, and notification channels.',
      input: ListAlertPoliciesInputSchema,
      handler: async (ctx, input: ListAlertPoliciesInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.orderBy) params.orderBy = input.orderBy;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/alertPolicies`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    getAlertPolicy: {
      isTool: true,
      description:
        "Get the full definition of a single alerting policy: its conditions, combiner, enabled state, notification channels, and documentation. Use the policy name/ID from listAlertPolicies. Call this before updateAlertPolicy so you can copy the existing conditions and modify only what's needed.",
      input: GetAlertPolicyInputSchema,
      handler: async (ctx, input: GetAlertPolicyInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const name = resolveResourceName(input.policyName, 'alertPolicies', projectId);

        try {
          const response = await ctx.client.get(`${MONITORING_API_BASE}/${name}`);
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    setAlertPolicyEnabled: {
      isTool: true,
      description:
        'Mute (enabled: false) or unmute (enabled: true) an alerting policy. This is the core lifecycle primitive Cloud Monitoring exposes in place of an acknowledge-incident call — muting stops the policy from opening new incidents without deleting or otherwise modifying it. Prefer createSnooze instead when you only want to suppress alerts for a bounded maintenance window, since a snooze automatically re-enables itself.',
      input: SetAlertPolicyEnabledInputSchema,
      handler: async (ctx, input: SetAlertPolicyEnabledInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const name = resolveResourceName(input.policyName, 'alertPolicies', projectId);

        try {
          const response = await ctx.client.patch(
            `${MONITORING_API_BASE}/${name}`,
            { name, enabled: input.enabled },
            { params: { updateMask: 'enabled' } }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    updateAlertPolicy: {
      isTool: true,
      description:
        'Update one or more fields of an existing alerting policy — display name, documentation, notification channels, combiner, conditions, or user labels. Only the fields you provide are changed; call getAlertPolicy first to see the current values, since notificationChannels and conditions are replaced wholesale (not merged) when set. Use this to widen a flapping threshold or fix routing instead of only muting the policy with setAlertPolicyEnabled.',
      input: UpdateAlertPolicyInputSchema,
      handler: async (ctx, input: UpdateAlertPolicyInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const name = resolveResourceName(input.policyName, 'alertPolicies', projectId);

        const updateMaskFields: string[] = [];
        const body: Record<string, unknown> = { name };

        if (input.displayName !== undefined) {
          body.displayName = input.displayName;
          updateMaskFields.push('displayName');
        }
        if (input.documentationContent !== undefined || input.documentationSubject !== undefined) {
          const documentation: Record<string, unknown> = {};
          if (input.documentationContent !== undefined) {
            documentation.content = input.documentationContent;
            documentation.mimeType = 'text/markdown';
            updateMaskFields.push('documentation.content', 'documentation.mimeType');
          }
          if (input.documentationSubject !== undefined) {
            documentation.subject = input.documentationSubject;
            updateMaskFields.push('documentation.subject');
          }
          body.documentation = documentation;
        }
        if (input.notificationChannels !== undefined) {
          body.notificationChannels = input.notificationChannels.map((channel) =>
            resolveResourceName(channel, 'notificationChannels', projectId)
          );
          updateMaskFields.push('notificationChannels');
        }
        if (input.combiner !== undefined) {
          body.combiner = input.combiner;
          updateMaskFields.push('combiner');
        }
        if (input.conditions !== undefined) {
          body.conditions = input.conditions;
          updateMaskFields.push('conditions');
        }
        if (input.userLabels !== undefined) {
          body.userLabels = input.userLabels;
          updateMaskFields.push('userLabels');
        }

        try {
          const response = await ctx.client.patch(`${MONITORING_API_BASE}/${name}`, body, {
            params: { updateMask: updateMaskFields.join(',') },
          });
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    createSnooze: {
      isTool: true,
      description:
        "Suppress alerts matching the given alert policies (and optional label filter) for a fixed time window, without disabling the policy itself — the safe way to quiet paging during a known maintenance window or an active incident. The snooze automatically stops applying after endTime, so there's nothing to remember to undo.",
      input: CreateSnoozeInputSchema,
      handler: async (ctx, input: CreateSnoozeInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);

        const criteria: Record<string, unknown> = {};
        if (input.policyNames?.length) {
          criteria.policies = input.policyNames.map((policyName) =>
            resolveResourceName(policyName, 'alertPolicies', projectId)
          );
        }
        if (input.filter) {
          criteria.filter = input.filter;
        }

        const body = {
          displayName: input.displayName,
          criteria,
          interval: { startTime: input.startTime, endTime: input.endTime },
        };

        try {
          const response = await ctx.client.post(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/snoozes`,
            body
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listSnoozes: {
      isTool: true,
      description:
        'List current and past snoozes in the project, so you can see what is currently suppressed before adjusting or creating another one. Pass a filter on interval.start_time / interval.end_time to narrow the results.',
      input: ListSnoozesInputSchema,
      handler: async (ctx, input: ListSnoozesInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/snoozes`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    updateSnooze: {
      isTool: true,
      description:
        'Realign an existing snooze so suppression tracks the incident instead of outlasting it: extend or shorten its window (startTime/endTime) or rename it. Set endTime to a time in the past to end an active snooze immediately.',
      input: UpdateSnoozeInputSchema,
      handler: async (ctx, input: UpdateSnoozeInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const name = resolveResourceName(input.snoozeName, 'snoozes', projectId);

        const updateMaskFields: string[] = [];
        const body: Record<string, unknown> = { name };
        const interval: Record<string, string> = {};

        if (input.displayName !== undefined) {
          body.displayName = input.displayName;
          updateMaskFields.push('displayName');
        }
        if (input.startTime !== undefined) {
          interval.startTime = input.startTime;
          updateMaskFields.push('interval.startTime');
        }
        if (input.endTime !== undefined) {
          interval.endTime = input.endTime;
          updateMaskFields.push('interval.endTime');
        }
        if (Object.keys(interval).length > 0) {
          body.interval = interval;
        }

        try {
          const response = await ctx.client.patch(`${MONITORING_API_BASE}/${name}`, body, {
            params: { updateMask: updateMaskFields.join(',') },
          });
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listNotificationChannels: {
      isTool: true,
      description:
        'List the notification channels configured in the project, so you can see where an alerting policy pages (email, Slack, PagerDuty, etc.) before editing its notificationChannels with updateAlertPolicy.',
      input: ListNotificationChannelsInputSchema,
      handler: async (ctx, input: ListNotificationChannelsInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.orderBy) params.orderBy = input.orderBy;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/notificationChannels`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listTimeSeries: {
      isTool: true,
      description:
        "Fetch the raw or aggregated metric values behind a firing alert, so a workflow can report the numbers that triggered it. Use the same or a similar filter as the alert condition (from getAlertPolicy's conditionThreshold.filter) and a time window that includes when the alert fired.",
      input: ListTimeSeriesInputSchema,
      handler: async (ctx, input: ListTimeSeriesInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number | string[]> = {
          filter: input.filter,
          'interval.startTime': input.startTime,
          'interval.endTime': input.endTime,
          view: input.view ?? 'FULL',
        };
        if (input.alignmentPeriod) params['aggregation.alignmentPeriod'] = input.alignmentPeriod;
        if (input.perSeriesAligner) params['aggregation.perSeriesAligner'] = input.perSeriesAligner;
        if (input.crossSeriesReducer)
          params['aggregation.crossSeriesReducer'] = input.crossSeriesReducer;
        if (input.groupByFields?.length) params['aggregation.groupByFields'] = input.groupByFields;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/timeSeries`,
            {
              params,
              // Cloud Monitoring expects nested Interval/Aggregation query fields as
              // dotted keys (interval.startTime, aggregation.alignmentPeriod, ...) and
              // repeated array fields as the plain repeated `?key=a&key=b` form, not
              // axios's default bracketed `key[]=a` form.
              paramsSerializer: { indexes: null },
            }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listUptimeCheckConfigs: {
      isTool: true,
      description:
        'List Uptime check configurations in the project, so you can correlate an availability alert back to the check that detected it (its monitored resource, HTTP/TCP settings, and check regions).',
      input: ListUptimeCheckConfigsInputSchema,
      handler: async (ctx, input: ListUptimeCheckConfigsInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/uptimeCheckConfigs`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listServices: {
      isTool: true,
      description:
        'List the Cloud Monitoring services defined in the project (App Engine, GKE, custom, etc.). Use the ID from a returned service name (the last segment of "projects/{project}/services/{id}") with listServiceLevelObjectives to check that service\'s error-budget status.',
      input: ListServicesInputSchema,
      handler: async (ctx, input: ListServicesInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/services`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },

    listServiceLevelObjectives: {
      isTool: true,
      description:
        'List the Service Level Objectives (SLOs) defined for a service, so a workflow can read error-budget status while triaging an incident. Use listServices first to find the serviceId.',
      input: ListServiceLevelObjectivesInputSchema,
      handler: async (ctx, input: ListServiceLevelObjectivesInput) => {
        const projectId = resolveProjectId(ctx, input.projectId);
        const parent = `projects/${encodeURIComponent(projectId)}/services/${encodeResourceSegment(
          input.serviceId
        )}`;
        const params: Record<string, string | number> = {};
        if (input.filter) params.filter = input.filter;
        if (input.view) params.view = input.view;
        if (input.pageSize !== undefined) params.pageSize = input.pageSize;
        if (input.pageToken) params.pageToken = input.pageToken;

        try {
          const response = await ctx.client.get(
            `${MONITORING_API_BASE}/${parent}/serviceLevelObjectives`,
            { params }
          );
          return response.data;
        } catch (error) {
          throwMonitoringError(error);
        }
      },
    },
  },

  skill: [
    '## Google Cloud Monitoring Connector',
    '',
    'Drives GCP alerting via the Cloud Monitoring API v3. Cloud Monitoring has no incidents REST resource, so there is no acknowledge-incident action — the lifecycle primitives are the `enabled` flag on an AlertPolicy (setAlertPolicyEnabled) and Snoozes (createSnooze/listSnoozes/updateSnooze).',
    '',
    '### Triage a firing alert',
    '1. `listAlertPolicies` (optionally with a `filter` on displayName) to find the policy behind the alert, then `getAlertPolicy` on its name for the full conditions, enabled state, and notification channels.',
    '2. `listTimeSeries` with the same filter as the condition that fired (`conditionThreshold.filter` from getAlertPolicy) to see the metric values that triggered it.',
    '3. For an availability alert, `listUptimeCheckConfigs` to find the check that detected it. For an SLO-backed service, `listServices` then `listServiceLevelObjectives` to read error-budget status.',
    '',
    '### Quiet a noisy monitor',
    '- Prefer `createSnooze` over `setAlertPolicyEnabled` when the goal is a bounded maintenance window or an active incident: a snooze re-enables itself at `endTime`, whereas `setAlertPolicyEnabled(enabled: false)` mutes the policy indefinitely until explicitly re-enabled.',
    '- `createSnooze` requires either `policyNames` (up to 16) or a single policy plus a label `filter` — exactly one policy name is required when `filter` is set.',
    '- Use `listSnoozes` to see what is currently suppressed, and `updateSnooze` to extend, shorten, or rename a snooze rather than creating a duplicate.',
    '',
    '### Update a policy',
    '- `updateAlertPolicy` replaces whichever fields you pass wholesale — `notificationChannels` and `conditions` are not merged with the existing values. Always call `getAlertPolicy` first and copy its `conditions`/`notificationChannels` array, modifying only what needs to change.',
    '',
    '### IDs',
    "Every action accepts either the bare resource ID or the full resource name (`projects/{project}/alertPolicies/{id}`, etc.) as returned by the corresponding list/get/create call — you don't need to construct resource names by hand.",
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate(
      'core.kibanaConnectorSpecs.googleCloudMonitoring.test.description',
      {
        defaultMessage:
          'Verifies Cloud Monitoring API access by listing alert policies in the configured project',
      }
    ),
    handler: async (ctx) => {
      const projectId = getDefaultProjectId(ctx);
      try {
        await ctx.client.get(
          `${MONITORING_API_BASE}/projects/${encodeURIComponent(projectId)}/alertPolicies`,
          { params: { pageSize: 1 } }
        );
        return { message: 'Successfully connected to the Cloud Monitoring API' };
      } catch (error) {
        throwMonitoringError(error);
      }
    },
  },
};
