/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import {
  DynatraceAddProblemCommentInputSchema,
  DynatraceCloseProblemInputSchema,
  DynatraceCreateMaintenanceWindowInputSchema,
  DynatraceDeleteMaintenanceWindowInputSchema,
  DynatraceGetEntityInputSchema,
  DynatraceGetEventInputSchema,
  DynatraceGetMetricDescriptorInputSchema,
  DynatraceGetProblemInputSchema,
  DynatraceIngestEventInputSchema,
  DynatraceListEntitiesInputSchema,
  DynatraceListEventsInputSchema,
  DynatraceListMaintenanceWindowsInputSchema,
  DynatraceListMetricsInputSchema,
  DynatraceListProblemCommentsInputSchema,
  DynatraceListProblemsInputSchema,
  DynatraceQueryMetricsInputSchema,
} from './types';
import type {
  DynatraceAddProblemCommentInput,
  DynatraceCloseProblemInput,
  DynatraceCreateMaintenanceWindowInput,
  DynatraceDeleteMaintenanceWindowInput,
  DynatraceGetEntityInput,
  DynatraceGetEventInput,
  DynatraceGetMetricDescriptorInput,
  DynatraceGetProblemInput,
  DynatraceIngestEventInput,
  DynatraceListEntitiesInput,
  DynatraceListEventsInput,
  DynatraceListMaintenanceWindowsInput,
  DynatraceListMetricsInput,
  DynatraceListProblemCommentsInput,
  DynatraceListProblemsInput,
  DynatraceQueryMetricsInput,
} from './types';

const MAINTENANCE_WINDOW_SCHEMA_ID = 'builtin:maintenance-windows';

/**
 * Normalize a user-supplied Dynatrace environment URL to the Environment API host.
 * The web UI often lives on `*.apps.dynatrace.com` (or `*.live.apps.dynatrace.com`);
 * Environment API calls must use `*.live.dynatrace.com` (or Managed / ActiveGate forms).
 */
const normalizeEnvironmentUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/$/, '');
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    // https://{id}.apps.dynatrace.com → https://{id}.live.dynatrace.com
    const appsMatch = host.match(/^([a-z0-9-]+)\.apps\.dynatrace\.com$/);
    if (appsMatch) {
      url.hostname = `${appsMatch[1]}.live.dynatrace.com`;
      return url.toString().replace(/\/$/, '');
    }
    // https://{id}.live.apps.dynatrace.com → https://{id}.live.dynatrace.com
    const liveAppsMatch = host.match(/^([a-z0-9-]+)\.live\.apps\.dynatrace\.com$/);
    if (liveAppsMatch) {
      url.hostname = `${liveAppsMatch[1]}.live.dynatrace.com`;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // Fall through and use the raw value; request will surface a clear error.
  }
  return trimmed;
};

const buildBaseUrl = (ctx: ActionContext): string => {
  const raw = ctx.config?.environmentUrl as string | undefined;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      'Dynatrace connector is missing the required environmentUrl configuration field.'
    );
  }
  return `${normalizeEnvironmentUrl(raw)}/api/v2`;
};

/**
 * Dynatrace Environment API expects `Authorization: Api-Token <token>`.
 * Users often paste the raw token only; Dynatrace then returns a misleading
 * 401 asking for a Bearer prefix. Accept raw or already-prefixed values and
 * always send a correct Authorization header on the request (overrides any
 * accidental default from api_key_header storage).
 */
const buildDynatraceAuthHeader = (rawToken: string): string => {
  const trimmed = rawToken.trim();
  if (/^(Api-Token|Bearer)\s+\S+/i.test(trimmed)) {
    return trimmed;
  }
  return `Api-Token ${trimmed}`;
};

const getAuthHeaders = (ctx: ActionContext): { Authorization: string } => {
  const secrets = ctx.secrets as Record<string, unknown> | undefined;
  const raw =
    (typeof secrets?.apiToken === 'string' && secrets.apiToken) ||
    (typeof secrets?.Authorization === 'string' && secrets.Authorization) ||
    '';
  if (!raw.trim()) {
    throw new Error('Dynatrace connector is missing the API token.');
  }
  return { Authorization: buildDynatraceAuthHeader(raw) };
};

function formatDynatraceError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ error?: { message?: string; code?: number } }>;
  if ((error as Error).message?.startsWith('Dynatrace')) {
    return error as Error;
  }
  const detail = err.response?.data?.error?.message ?? err.message;
  return new Error(
    `Dynatrace ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

const pickDefined = (
  params: Record<string, string | number | undefined>
): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
};

interface RequestExtras {
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

const dtGet = async <T>(ctx: ActionContext, path: string, extras: RequestExtras = {}) =>
  ctx.client.get<T>(`${buildBaseUrl(ctx)}${path}`, {
    ...extras,
    headers: { ...getAuthHeaders(ctx), ...extras.headers },
  });

const dtPost = async <T>(
  ctx: ActionContext,
  path: string,
  body?: unknown,
  extras: RequestExtras = {}
) =>
  ctx.client.post<T>(`${buildBaseUrl(ctx)}${path}`, body, {
    ...extras,
    headers: { ...getAuthHeaders(ctx), ...extras.headers },
  });

const dtDelete = async <T>(ctx: ActionContext, path: string, extras: RequestExtras = {}) =>
  ctx.client.delete<T>(`${buildBaseUrl(ctx)}${path}`, {
    ...extras,
    headers: { ...getAuthHeaders(ctx), ...extras.headers },
  });

export const Dynatrace: ConnectorSpec = {
  metadata: {
    id: '.dynatrace',
    displayName: 'Dynatrace',
    description: i18n.translate('core.kibanaConnectorSpecs.dynatrace.metadata.description', {
      defaultMessage:
        'Triage Dynatrace Davis problems, ingest events, query metrics and entities, and manage maintenance windows via the Environment API v2.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        isRecommended: true,
        // Store under apiToken (not Authorization) so the framework does not set a
        // bare Authorization default; handlers send Authorization: Api-Token <token>.
        defaults: { headerField: 'apiToken' },
        overrides: {
          meta: {
            apiToken: {
              label: i18n.translate('core.kibanaConnectorSpecs.dynatrace.auth.apiToken.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.dynatrace.auth.apiToken.helpText',
                {
                  defaultMessage:
                    'Paste your Dynatrace API token value only (for example dt0c01....). Do not include a prefix — the connector sends Authorization: Api-Token automatically. Required scopes: problems.read, problems.write, events.read, events.ingest, metrics.read, entities.read, settings.read, settings.write.',
                }
              ),
              placeholder: 'dt0c01.{{YOUR_TOKEN}}',
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      environmentUrl: UISchemas.url()
        .describe('Dynatrace environment base URL (without /api/v2).')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.dynatrace.config.environmentUrl.label', {
            defaultMessage: 'Environment URL',
          }),
          placeholder: 'https://{environment-id}.live.dynatrace.com',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.dynatrace.config.environmentUrl.helpText',
            {
              defaultMessage:
                'Environment API base URL, without /api/v2. SaaS must use https://your-environment-id.live.dynatrace.com (not the *.apps.dynatrace.com UI host). Managed: https://your-domain/e/your-environment-id. Environment ActiveGate: https://your-activegate-domain:9999/e/your-environment-id. Trial/sandbox environments still use the .live.dynatrace.com API host.',
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['environmentUrl'],
  },

  actions: {
    listProblems: {
      isTool: true,
      description:
        'List Dynatrace Davis problems, optionally filtered by problemSelector, entitySelector, and time range. Primary read that kicks off an alert-response workflow. Returns the Problems API v2 list envelope (problems, pageSize, nextPageKey, totalCount).',
      input: DynatraceListProblemsInputSchema,
      handler: async (ctx, input: DynatraceListProblemsInput) => {
        try {
          const response = await dtGet(ctx, '/problems', {
            params: pickDefined({
              problemSelector: input.problemSelector,
              entitySelector: input.entitySelector,
              from: input.from,
              to: input.to,
              fields: input.fields,
              sort: input.sort,
              pageSize: input.pageSize,
              nextPageKey: input.nextPageKey,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listProblems', error);
        }
      },
    },

    getProblem: {
      isTool: true,
      description:
        'Get one Dynatrace problem by ID, including root cause, affected entities, evidence, and timeline when requested via fields. Use after listProblems to enrich before acting.',
      input: DynatraceGetProblemInputSchema,
      handler: async (ctx, input: DynatraceGetProblemInput) => {
        try {
          const response = await dtGet(ctx, `/problems/${encodeURIComponent(input.problemId)}`, {
            params: pickDefined({ fields: input.fields }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('getProblem', error);
        }
      },
    },

    closeProblem: {
      isTool: true,
      description:
        'Close a remediated Dynatrace problem and record a closing comment. Terminal step of an alert-response workflow. If the problem is already closed, returns alreadyClosed: true without error.',
      input: DynatraceCloseProblemInputSchema,
      handler: async (ctx, input: DynatraceCloseProblemInput) => {
        try {
          const response = await dtPost(
            ctx,
            `/problems/${encodeURIComponent(input.problemId)}/close`,
            { message: input.message }
          );
          if (response.status === 204) {
            return { alreadyClosed: true, problemId: input.problemId };
          }
          return response.data;
        } catch (error) {
          throw formatDynatraceError('closeProblem', error);
        }
      },
    },

    addProblemComment: {
      isTool: true,
      description:
        'Post a comment on a Dynatrace problem so workflow actions and triage notes land in the Dynatrace audit trail.',
      input: DynatraceAddProblemCommentInputSchema,
      handler: async (ctx, input: DynatraceAddProblemCommentInput) => {
        try {
          const body: { message: string; context?: string } = { message: input.message };
          if (input.context !== undefined) body.context = input.context;
          const response = await dtPost(
            ctx,
            `/problems/${encodeURIComponent(input.problemId)}/comments`,
            body
          );
          return { status: response.status, problemId: input.problemId };
        } catch (error) {
          throw formatDynatraceError('addProblemComment', error);
        }
      },
    },

    listProblemComments: {
      isTool: true,
      description:
        "List an existing problem's comment thread for human context before an agent or workflow acts.",
      input: DynatraceListProblemCommentsInputSchema,
      handler: async (ctx, input: DynatraceListProblemCommentsInput) => {
        try {
          const response = await dtGet(
            ctx,
            `/problems/${encodeURIComponent(input.problemId)}/comments`,
            {
              params: pickDefined({
                pageSize: input.pageSize,
                nextPageKey: input.nextPageKey,
              }),
            }
          );
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listProblemComments', error);
        }
      },
    },

    ingestEvent: {
      isTool: true,
      description:
        'Ingest a custom event (deployment, config change, annotation, remediation marker, etc.) onto entities so Davis can correlate it. Use CUSTOM_ANNOTATION / CUSTOM_DEPLOYMENT / CUSTOM_INFO for workflow markers.',
      input: DynatraceIngestEventInputSchema,
      handler: async (ctx, input: DynatraceIngestEventInput) => {
        try {
          const body: Record<string, unknown> = {
            eventType: input.eventType,
            title: input.title,
          };
          if (input.entitySelector !== undefined) body.entitySelector = input.entitySelector;
          if (input.properties !== undefined) body.properties = input.properties;
          if (input.startTime !== undefined) body.startTime = input.startTime;
          if (input.endTime !== undefined) body.endTime = input.endTime;
          if (input.timeout !== undefined) body.timeout = input.timeout;
          const response = await dtPost(ctx, '/events/ingest', body);
          return response.data;
        } catch (error) {
          throw formatDynatraceError('ingestEvent', error);
        }
      },
    },

    listEvents: {
      isTool: true,
      description:
        'List events in the environment, optionally filtered by eventSelector, entitySelector, and time range. Read-side feed to poll or correlate against a problem.',
      input: DynatraceListEventsInputSchema,
      handler: async (ctx, input: DynatraceListEventsInput) => {
        try {
          const response = await dtGet(ctx, '/events', {
            params: pickDefined({
              eventSelector: input.eventSelector,
              entitySelector: input.entitySelector,
              from: input.from,
              to: input.to,
              pageSize: input.pageSize,
              nextPageKey: input.nextPageKey,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listEvents', error);
        }
      },
    },

    getEvent: {
      isTool: true,
      description: 'Get one Dynatrace event by ID for enrichment.',
      input: DynatraceGetEventInputSchema,
      handler: async (ctx, input: DynatraceGetEventInput) => {
        try {
          const response = await dtGet(ctx, `/events/${encodeURIComponent(input.eventId)}`);
          return response.data;
        } catch (error) {
          throw formatDynatraceError('getEvent', error);
        }
      },
    },

    queryMetrics: {
      isTool: true,
      description:
        'Query metric data points (CPU, latency, error rate, etc.) for a metricSelector and time range. Evidence a workflow branches on.',
      input: DynatraceQueryMetricsInputSchema,
      handler: async (ctx, input: DynatraceQueryMetricsInput) => {
        try {
          const response = await dtGet(ctx, '/metrics/query', {
            params: pickDefined({
              metricSelector: input.metricSelector,
              from: input.from,
              to: input.to,
              resolution: input.resolution,
              entitySelector: input.entitySelector,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('queryMetrics', error);
        }
      },
    },

    listMetrics: {
      isTool: true,
      description:
        'Discover available metric keys and descriptors, optionally filtered by metricSelector or free-text search. Use to pick a selector for queryMetrics.',
      input: DynatraceListMetricsInputSchema,
      handler: async (ctx, input: DynatraceListMetricsInput) => {
        try {
          const response = await dtGet(ctx, '/metrics', {
            params: pickDefined({
              metricSelector: input.metricSelector,
              text: input.text,
              fields: input.fields,
              pageSize: input.pageSize,
              nextPageKey: input.nextPageKey,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listMetrics', error);
        }
      },
    },

    getMetricDescriptor: {
      isTool: true,
      description:
        'Get the descriptor for one metric (dimensions, units, default aggregation) by metric ID/key.',
      input: DynatraceGetMetricDescriptorInputSchema,
      handler: async (ctx, input: DynatraceGetMetricDescriptorInput) => {
        try {
          const response = await dtGet(ctx, `/metrics/${encodeURIComponent(input.metricId)}`, {
            params: pickDefined({ fields: input.fields }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('getMetricDescriptor', error);
        }
      },
    },

    listEntities: {
      isTool: true,
      description:
        'Query monitored entities (hosts, services, applications, process groups) via an entitySelector so a workflow can resolve topology a problem touches.',
      input: DynatraceListEntitiesInputSchema,
      handler: async (ctx, input: DynatraceListEntitiesInput) => {
        try {
          const response = await dtGet(ctx, '/entities', {
            params: pickDefined({
              entitySelector: input.entitySelector,
              from: input.from,
              to: input.to,
              fields: input.fields,
              pageSize: input.pageSize,
              nextPageKey: input.nextPageKey,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listEntities', error);
        }
      },
    },

    getEntity: {
      isTool: true,
      description:
        "Get one entity's properties and relationships by entity ID to enrich an alert with the affected service or host.",
      input: DynatraceGetEntityInputSchema,
      handler: async (ctx, input: DynatraceGetEntityInput) => {
        try {
          const response = await dtGet(ctx, `/entities/${encodeURIComponent(input.entityId)}`, {
            params: pickDefined({
              fields: input.fields,
              from: input.from,
              to: input.to,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('getEntity', error);
        }
      },
    },

    createMaintenanceWindow: {
      isTool: true,
      description:
        'Create a once-off maintenance window via the Settings API (schema builtin:maintenance-windows) to suppress alerting for a DQL-filtered scope during a deploy or planned change.',
      input: DynatraceCreateMaintenanceWindowInputSchema,
      handler: async (ctx, input: DynatraceCreateMaintenanceWindowInput) => {
        try {
          const schedule: Record<string, unknown> = {
            duration: input.durationMinutes,
            trigger: {
              type: 'once',
              once: { date: input.startDateTime },
            },
          };
          if (input.timezone !== undefined) schedule.timezone = input.timezone;

          const value: Record<string, unknown> = {
            name: input.name,
            enabled: input.enabled ?? true,
            autoDelete: input.autoDelete ?? true,
            filter: input.filter,
            schedule,
          };
          if (input.description !== undefined) value.description = input.description;

          const response = await dtPost(ctx, '/settings/objects', [
            {
              schemaId: MAINTENANCE_WINDOW_SCHEMA_ID,
              scope: 'environment',
              value,
            },
          ]);
          return response.data;
        } catch (error) {
          throw formatDynatraceError('createMaintenanceWindow', error);
        }
      },
    },

    listMaintenanceWindows: {
      isTool: true,
      description:
        'List existing maintenance windows (Settings objects for builtin:maintenance-windows) so a workflow can check current suppression state or find one to tear down.',
      input: DynatraceListMaintenanceWindowsInputSchema,
      handler: async (ctx, input: DynatraceListMaintenanceWindowsInput) => {
        try {
          const response = await dtGet(ctx, '/settings/objects', {
            params: pickDefined({
              schemaIds: MAINTENANCE_WINDOW_SCHEMA_ID,
              pageSize: input.pageSize,
              nextPageKey: input.nextPageKey,
              fields: input.fields,
            }),
          });
          return response.data;
        } catch (error) {
          throw formatDynatraceError('listMaintenanceWindows', error);
        }
      },
    },

    deleteMaintenanceWindow: {
      isTool: true,
      description:
        'Delete a maintenance window by Settings object ID, pairing with createMaintenanceWindow to complete the mute/unmute lifecycle after a change.',
      input: DynatraceDeleteMaintenanceWindowInputSchema,
      handler: async (ctx, input: DynatraceDeleteMaintenanceWindowInput) => {
        try {
          await dtDelete(ctx, `/settings/objects/${encodeURIComponent(input.objectId)}`);
          return { deleted: true, objectId: input.objectId };
        } catch (error) {
          throw formatDynatraceError('deleteMaintenanceWindow', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.dynatrace.test.description', {
      defaultMessage: 'Verify connectivity by listing a single Dynatrace problem.',
    }),
    handler: async (ctx) => {
      try {
        await dtGet(ctx, '/problems', { params: { pageSize: 1 } });
        return {};
      } catch (error) {
        throw formatDynatraceError('test', error);
      }
    },
  },

  skill: [
    '## Dynatrace Connector',
    '',
    'Use this connector to drive Davis problem triage, gather metric/entity evidence, ingest workflow events, and manage maintenance windows against a Dynatrace environment.',
    '',
    '### Authentication',
    '- Paste the raw API token only (e.g. `dt0c01....`); the connector sends `Authorization: Api-Token <token>` automatically.',
    `- Token scopes needed: problems.read, problems.write, events.read, events.ingest, metrics.read, entities.read, settings.read, settings.write.`,
    '',
    '### Common patterns',
    '- Alert response: `listProblems` → `getProblem` → optional `listProblemComments` / `queryMetrics` / `listEntities` → `addProblemComment` and/or `closeProblem`.',
    '- Mark remediations: `ingestEvent` with CUSTOM_ANNOTATION, CUSTOM_DEPLOYMENT, or CUSTOM_INFO and an entitySelector targeting the affected entities.',
    '- Mute during change: `createMaintenanceWindow` (once schedule + DQL filter) → after the change `deleteMaintenanceWindow` with the returned objectId. Use `listMaintenanceWindows` to find existing windows.',
    '- Metric evidence: `listMetrics` / `getMetricDescriptor` to discover keys, then `queryMetrics` with a metricSelector.',
    '',
    '### Gotchas',
    '- `environmentUrl` is the environment base only (no `/api/v2`); handlers append `/api/v2`.',
    '- Maintenance windows use the Settings API schema `builtin:maintenance-windows` (not the deprecated Config v1 maintenance-windows API). The `filter` field is DQL.',
    '- Metric IDs often contain `:` — path segments are URL-encoded automatically.',
    '- Closing an already-closed problem returns HTTP 204; the connector maps that to `{ alreadyClosed: true }`.',
  ].join('\n'),
};
