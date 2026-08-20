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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  CancelDowntimeInputSchema,
  CreateIncidentInputSchema,
  DATADOG_SITE_API_URLS,
  DATADOG_SITES,
  GetAlertEventsInputSchema,
  GetMonitorInputSchema,
  ListMonitorsInputSchema,
  MuteMonitorInputSchema,
  PostEventInputSchema,
  QueryTimeseriesInputSchema,
  ScheduleDowntimeInputSchema,
  SearchLogsInputSchema,
  UnmuteMonitorInputSchema,
  UpdateIncidentInputSchema,
  type CancelDowntimeInput,
  type CreateIncidentInput,
  type DatadogSite,
  type GetAlertEventsInput,
  type GetMonitorInput,
  type ListMonitorsInput,
  type MuteMonitorInput,
  type PostEventInput,
  type QueryTimeseriesInput,
  type ScheduleDowntimeInput,
  type SearchLogsInput,
  type UnmuteMonitorInput,
  type UpdateIncidentInput,
} from './types';

/**
 * Datadog requires both DD-API-KEY and DD-APPLICATION-KEY headers. Connector
 * secrets use the basic auth type with relabeled fields (username = API key,
 * password = application key). Before each request we map those onto the
 * Datadog headers and clear axios HTTP Basic auth so Datadog never sees an
 * Authorization: Basic header.
 */
const applyDatadogAuthHeaders = (ctx: ActionContext): void => {
  const secrets = ctx.secrets;
  if (!secrets || secrets.authType !== 'basic') {
    throw new Error('Datadog connector requires API Key and Application Key (basic auth secrets).');
  }
  const apiKey = secrets.username;
  const applicationKey = secrets.password;
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    throw new Error('Datadog connector is missing the API Key.');
  }
  if (typeof applicationKey !== 'string' || applicationKey.length === 0) {
    throw new Error('Datadog connector is missing the Application Key.');
  }
  ctx.client.defaults.headers.common['DD-API-KEY'] = apiKey;
  ctx.client.defaults.headers.common['DD-APPLICATION-KEY'] = applicationKey;
  delete ctx.client.defaults.auth;
};

const getBaseUrl = (ctx: ActionContext): string => {
  const site = (ctx.config?.site as DatadogSite | undefined) ?? 'datadoghq.com';
  const baseUrl = DATADOG_SITE_API_URLS[site];
  if (!baseUrl) {
    throw new Error(
      `Datadog connector has an unrecognized site "${site}". Choose one of: ${DATADOG_SITES.join(
        ', '
      )}.`
    );
  }
  return baseUrl;
};

function formatDatadogError(action: string, error: unknown): Error {
  const err = error as AxiosError<{
    errors?: string[] | Array<{ title?: string; detail?: string }>;
    error?: string;
    status?: string;
  }>;
  const data = err.response?.data;
  let detail = err.message;
  if (data) {
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      detail = data.errors
        .map((e) => (typeof e === 'string' ? e : e.detail ?? e.title ?? JSON.stringify(e)))
        .join('; ');
    } else if (typeof data.error === 'string') {
      detail = data.error;
    } else if (typeof data.status === 'string') {
      detail = data.status;
    } else {
      try {
        detail = JSON.stringify(data);
      } catch {
        detail = String(data);
      }
    }
  }
  return new Error(
    `Datadog ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

const joinCsv = (values: string[] | undefined): string | undefined =>
  values && values.length > 0 ? values.join(',') : undefined;

export const Datadog: ConnectorSpec = {
  metadata: {
    id: '.datadog',
    displayName: 'Datadog',
    description: i18n.translate('core.kibanaConnectorSpecs.datadog.metadata.description', {
      defaultMessage:
        'List and mute monitors, manage downtimes and incidents, post events, and query metrics and logs in Datadog',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.datadog.auth.basic.label', {
            defaultMessage: 'API and Application keys',
          }),
          meta: {
            username: {
              label: i18n.translate('core.kibanaConnectorSpecs.datadog.auth.apiKey.label', {
                defaultMessage: 'API Key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.datadog.auth.apiKey.helpText', {
                defaultMessage:
                  'Datadog API key from Organization Settings > API Keys. Required together with an Application Key for monitor, downtime, incident, event, metric, and log actions.',
              }),
            },
            password: {
              label: i18n.translate('core.kibanaConnectorSpecs.datadog.auth.applicationKey.label', {
                defaultMessage: 'Application Key',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.datadog.auth.applicationKey.helpText',
                {
                  defaultMessage:
                    'Datadog application key from Organization Settings > Application Keys. Required together with an API Key for monitor, downtime, incident, event, metric, and log actions.',
                }
              ),
            },
          },
        },
      },
    ],
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },

  schema: lazySchema(() =>
    z.object({
      site: z
        .enum(DATADOG_SITES)
        .default('datadoghq.com')
        .describe(
          'Datadog site (region) where the account lives. Maps to the regional API host, e.g. datadoghq.com → api.datadoghq.com.'
        )
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.datadog.config.site.label', {
            defaultMessage: 'Datadog site',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.datadog.config.site.helpText', {
            defaultMessage:
              'Select the Datadog site shown in your Datadog URL (for example datadoghq.com for US1, datadoghq.eu for EU1, us3.datadoghq.com for US3). Requests go to the matching api.* host.',
          }),
        }),
    })
  ),

  actions: {
    listMonitors: {
      isTool: true,
      scope: 'read',
      description:
        'List Datadog monitors and their alert states, optionally filtered by tags, name, or group state. Use this to enumerate alerting rules before acting on a specific monitor.',
      input: ListMonitorsInputSchema,
      handler: async (ctx, input: ListMonitorsInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.get(`${baseUrl}/api/v1/monitor`, {
            params: {
              tags: joinCsv(input.tags),
              monitor_tags: joinCsv(input.monitorTags),
              name: input.name,
              group_states: joinCsv(input.groupStates),
              with_downtimes: input.withDowntimes,
              page: input.page,
              page_size: input.pageSize,
            },
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('listMonitors', error);
        }
      },
    },

    getMonitor: {
      isTool: true,
      scope: 'read',
      description:
        "Retrieve a single Datadog monitor's full definition and current overall state by numeric ID. Use the IDs returned by listMonitors.",
      input: GetMonitorInputSchema,
      handler: async (ctx, input: GetMonitorInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.get(
            `${baseUrl}/api/v1/monitor/${encodeURIComponent(String(input.monitorId))}`,
            {
              params: {
                group_states: joinCsv(input.groupStates),
              },
            }
          );
          return response.data;
        } catch (error) {
          throw formatDatadogError('getMonitor', error);
        }
      },
    },

    getAlertEvents: {
      isTool: true,
      scope: 'read',
      description:
        'Search Datadog alert-type events over a time range. Use this to triage and enrich a firing monitor with recent alert events from the event stream.',
      input: GetAlertEventsInputSchema,
      handler: async (ctx, input: GetAlertEventsInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        const query = /\bsource\s*:/i.test(input.query)
          ? input.query
          : `source:alert ${input.query}`.trim();
        try {
          const response = await ctx.client.post(`${baseUrl}/api/v2/events/search`, {
            filter: {
              query,
              from: input.from,
              to: input.to,
            },
            page: {
              limit: input.limit ?? 50,
            },
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('getAlertEvents', error);
        }
      },
    },

    muteMonitor: {
      isTool: true,
      scope: 'destroy',
      description:
        'Mute a Datadog monitor (optionally for a scope or until a timestamp) so notifications are suppressed during maintenance or noise suppression.',
      input: MuteMonitorInputSchema,
      handler: async (ctx, input: MuteMonitorInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/api/v1/monitor/${encodeURIComponent(String(input.monitorId))}/mute`,
            undefined,
            {
              params: {
                scope: input.scope,
                end: input.end,
              },
            }
          );
          return response.data;
        } catch (error) {
          throw formatDatadogError('muteMonitor', error);
        }
      },
    },

    unmuteMonitor: {
      isTool: true,
      scope: 'destroy',
      description:
        'Unmute a previously muted Datadog monitor (optionally for a scope) so notifications resume.',
      input: UnmuteMonitorInputSchema,
      handler: async (ctx, input: UnmuteMonitorInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(
            `${baseUrl}/api/v1/monitor/${encodeURIComponent(String(input.monitorId))}/unmute`,
            undefined,
            {
              params: {
                scope: input.scope,
                all_scopes: input.allScopes,
              },
            }
          );
          return response.data;
        } catch (error) {
          throw formatDatadogError('unmuteMonitor', error);
        }
      },
    },

    scheduleDowntime: {
      isTool: true,
      scope: 'write',
      description:
        'Schedule a Datadog downtime for a scope (and optional monitor tags or monitor ID) over a time window so alerting is suppressed during deploys or maintenance.',
      input: ScheduleDowntimeInputSchema,
      handler: async (ctx, input: ScheduleDowntimeInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        const monitorIdentifier = input.monitorId
          ? { monitor_id: input.monitorId }
          : { monitor_tags: input.monitorTags ?? ['*'] };
        try {
          const response = await ctx.client.post(`${baseUrl}/api/v2/downtime`, {
            data: {
              type: 'downtime',
              attributes: {
                scope: input.scope,
                monitor_identifier: monitorIdentifier,
                schedule: {
                  start: input.start,
                  end: input.end,
                },
                ...(input.message ? { message: input.message } : {}),
              },
            },
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('scheduleDowntime', error);
        }
      },
    },

    cancelDowntime: {
      isTool: true,
      scope: 'destroy',
      description:
        'Cancel an active or scheduled Datadog downtime by ID so alerting resumes for that scope. Use the downtime ID returned by scheduleDowntime.',
      input: CancelDowntimeInputSchema,
      handler: async (ctx, input: CancelDowntimeInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.delete(
            `${baseUrl}/api/v2/downtime/${encodeURIComponent(input.downtimeId)}`
          );
          return response.data ?? {};
        } catch (error) {
          throw formatDatadogError('cancelDowntime', error);
        }
      },
    },

    createIncident: {
      isTool: true,
      scope: 'write',
      description:
        'Create a Datadog incident (for example when an alert crosses a severity threshold). Returns the new incident including its ID for later updateIncident calls. Requires Datadog Incident Management to be enabled on the account.',
      input: CreateIncidentInputSchema,
      handler: async (ctx, input: CreateIncidentInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        // Datadog Incident Management single-select fields use
        // `{ type: 'dropdown', value: '<string>' }` (see IncidentFieldAttributesSingleValue).
        // Do not send top-level `severity` — some orgs return HTTP 500 for that shape.
        const fields: Record<string, unknown> = {};
        if (input.severity) {
          fields.severity = {
            type: 'dropdown',
            value: input.severity,
          };
        }
        if (input.detectionMethod) {
          fields.detection_method = {
            type: 'dropdown',
            value: input.detectionMethod,
          };
        }
        const attributes: Record<string, unknown> = {
          title: input.title,
          customer_impacted: input.customerImpacted ?? false,
        };
        if (Object.keys(fields).length > 0) {
          attributes.fields = fields;
        }
        if (input.initialCell) {
          attributes.initial_cells = [
            {
              cell_type: 'markdown',
              content: {
                content: input.initialCell,
              },
            },
          ];
        }
        try {
          const response = await ctx.client.post(`${baseUrl}/api/v2/incidents`, {
            data: {
              type: 'incidents',
              attributes,
            },
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('createIncident', error);
        }
      },
    },

    updateIncident: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update a Datadog incident (title, severity, customer impact, or state such as resolved). Provide at least one field to change. Use the incident ID from createIncident.',
      input: UpdateIncidentInputSchema,
      handler: async (ctx, input: UpdateIncidentInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        const attributes: Record<string, unknown> = {};
        if (input.title !== undefined) {
          attributes.title = input.title;
        }
        if (input.customerImpacted !== undefined) {
          attributes.customer_impacted = input.customerImpacted;
        }
        const fields: Record<string, unknown> = {};
        if (input.state !== undefined) {
          fields.state = {
            type: 'dropdown',
            value: input.state,
          };
        }
        if (input.severity !== undefined) {
          fields.severity = {
            type: 'dropdown',
            value: input.severity,
          };
        }
        if (Object.keys(fields).length > 0) {
          attributes.fields = fields;
        }
        try {
          const response = await ctx.client.patch(
            `${baseUrl}/api/v2/incidents/${encodeURIComponent(input.incidentId)}`,
            {
              data: {
                id: input.incidentId,
                type: 'incidents',
                attributes,
              },
            }
          );
          return response.data;
        } catch (error) {
          throw formatDatadogError('updateIncident', error);
        }
      },
    },

    postEvent: {
      isTool: true,
      scope: 'write',
      description:
        'Post an event to the Datadog Events Explorer so workflow actions (remediation ran, ticket opened) appear on Datadog timelines and dashboards.',
      input: PostEventInputSchema,
      handler: async (ctx, input: PostEventInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(`${baseUrl}/api/v1/events`, {
            title: input.title,
            text: input.text,
            ...(input.tags ? { tags: input.tags } : {}),
            ...(input.alertType ? { alert_type: input.alertType } : {}),
            ...(input.aggregationKey ? { aggregation_key: input.aggregationKey } : {}),
            ...(input.dateHappened ? { date_happened: input.dateHappened } : {}),
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('postEvent', error);
        }
      },
    },

    queryTimeseries: {
      isTool: true,
      scope: 'read',
      description:
        'Query Datadog timeseries metrics over a time range. Use this to confirm or enrich an alert with the metric current value before acting.',
      input: QueryTimeseriesInputSchema,
      handler: async (ctx, input: QueryTimeseriesInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.get(`${baseUrl}/api/v1/query`, {
            params: {
              query: input.query,
              from: input.from,
              to: input.to,
            },
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('queryTimeseries', error);
        }
      },
    },

    searchLogs: {
      isTool: true,
      scope: 'read',
      description:
        'Search Datadog logs over a time range and optional indexes. Use matching log events as evidence during alert triage or incident response. Requires Log Management with at least one valid index on the Datadog account; pass indexes (e.g. ["main"]) when the account does not search all indexes by default.',
      input: SearchLogsInputSchema,
      handler: async (ctx, input: SearchLogsInput) => {
        applyDatadogAuthHeaders(ctx);
        const baseUrl = getBaseUrl(ctx);
        try {
          const response = await ctx.client.post(`${baseUrl}/api/v2/logs/events/search`, {
            filter: {
              query: input.query,
              from: input.from,
              to: input.to,
              ...(input.indexes ? { indexes: input.indexes } : {}),
              ...(input.storageTier ? { storage_tier: input.storageTier } : {}),
            },
            page: {
              limit: input.limit ?? 50,
            },
            ...(input.sort ? { sort: input.sort } : {}),
          });
          return response.data;
        } catch (error) {
          throw formatDatadogError('searchLogs', error);
        }
      },
    },
  },

  skill: [
    '## Datadog Connector',
    '',
    'Use this connector to triage Datadog monitors and respond end to end: read monitors and alert events, confirm with metrics or logs, then mute, schedule downtime, open or update an incident, or post an event.',
    '',
    '### Common patterns',
    '- To triage a firing alert: call `listMonitors` (or `getMonitor` with a known ID), then `getAlertEvents` with a query such as `monitor_id:12345`, then optionally `queryTimeseries` or `searchLogs` for evidence.',
    '- To suppress noise during a deploy: call `scheduleDowntime` with a scope and window, then `cancelDowntime` with the returned ID when finished. For a single monitor, prefer `muteMonitor` / `unmuteMonitor`.',
    '- To open an incident from an alert: call `createIncident` with a title and severity, then `updateIncident` to set state to `resolved` when done. Pass the incident ID returned by create.',
    '- To leave a breadcrumb on Datadog timelines: call `postEvent` with a title, text, and tags after remediation.',
    '',
    '### Gotchas',
    '- Auth needs both an API key and an Application key; requests fail with 403 if either is missing or lacks permission for the action.',
    '- Pick the correct Datadog site (region). Keys from US1 (`datadoghq.com`) will not authenticate against EU (`datadoghq.eu`) or other sites.',
    '- Monitor IDs are numeric; downtime and incident IDs from the v2 APIs are UUID strings. Always use IDs returned by prior actions.',
    '- `scheduleDowntime` uses the v2 downtime API (JSON:API body). `cancelDowntime` expects the v2 downtime UUID.',
    '- `getAlertEvents` prefixes `source:alert` when the query does not already include a `source:` clause.',
    '- Metric `from`/`to` for `queryTimeseries` are Unix seconds; log/event windows use ISO 8601 (or relative strings such as `now-1h`).',
    '- `createIncident` / `updateIncident` put severity and state under `fields` as `{ type: "dropdown", value: "SEV-2" }` / `{ type: "dropdown", value: "resolved" }`. Do not send top-level `severity` (some orgs return HTTP 500).',
    '- `updateIncident` can return 403 "required seat" when the Datadog org lacks an Incident Management seat for the Application Key user.',
    '- `searchLogs` requires Log Management with at least one valid index; otherwise Datadog returns 400 "No valid indexes specified".',
  ].join('\n'),

  test: {
    enabled: true,
    description: 'Validates the API and Application keys against the selected Datadog site.',
    handler: async (ctx) => {
      applyDatadogAuthHeaders(ctx);
      const baseUrl = getBaseUrl(ctx);
      await ctx.client.get(`${baseUrl}/api/v1/validate`);
      return {};
    },
  },
};
