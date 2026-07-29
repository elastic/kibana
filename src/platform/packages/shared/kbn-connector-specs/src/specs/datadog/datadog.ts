/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Datadog Connector (v2)
 *
 * Alert-source connector for Datadog monitors:
 * - Test connection (API key + application key)
 * - Register / get / delete outbound webhooks (Datadog → Kibana URL)
 * - Mute / unmute / get / list monitors (write-back + discovery)
 *
 * Auth uses basic-auth fields relabeled as API Key + Application Key (both
 * encrypted). Handlers send DD-API-KEY / DD-APPLICATION-KEY headers; Datadog
 * ignores the unused HTTP Basic Authorization header.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  DATADOG_WEBHOOK_PAYLOAD_TEMPLATE,
  GetMonitorInputSchema,
  ListMonitorsInputSchema,
  MuteMonitorInputSchema,
  RegisterWebhookInputSchema,
  UnmuteMonitorInputSchema,
  WebhookNameInputSchema,
  type GetMonitorInput,
  type ListMonitorsInput,
  type MuteMonitorInput,
  type RegisterWebhookInput,
  type UnmuteMonitorInput,
  type WebhookNameInput,
} from './types';

interface DatadogSecrets {
  authType?: string;
  username?: string;
  password?: string;
}

interface DatadogConfig {
  site?: string;
}

function getSite(ctx: ActionContext): string {
  const site = (ctx.config as DatadogConfig | undefined)?.site?.trim();
  return site && site.length > 0 ? site : 'datadoghq.com';
}

function getBaseUrl(ctx: ActionContext): string {
  return `https://api.${getSite(ctx)}`;
}

function getDdHeaders(ctx: ActionContext): Record<string, string> {
  const secrets = (ctx.secrets ?? {}) as DatadogSecrets;
  const apiKey = secrets.username;
  const applicationKey = secrets.password;
  if (!apiKey || !applicationKey) {
    throw new Error('Datadog API Key and Application Key are required');
  }
  return {
    'DD-API-KEY': apiKey,
    'DD-APPLICATION-KEY': applicationKey,
    'Content-Type': 'application/json',
  };
}

export const DatadogConnector: ConnectorSpec = {
  metadata: {
    id: '.datadog',
    displayName: 'Datadog',
    description: i18n.translate('connectorSpecs.datadog.metadata.description', {
      defaultMessage:
        'Connect to Datadog: manage monitors and webhooks, with room for downtimes, events, hosts, and more',
    }),
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'alerting'],
  },

  auth: {
    types: [
      {
        type: 'basic',
        overrides: {
          label: i18n.translate('connectorSpecs.datadog.auth.label', {
            defaultMessage: 'API Key + Application Key',
          }),
          meta: {
            username: {
              label: i18n.translate('connectorSpecs.datadog.auth.apiKey.label', {
                defaultMessage: 'API Key',
              }),
              helpText: i18n.translate('connectorSpecs.datadog.auth.apiKey.helpText', {
                defaultMessage:
                  'Datadog API key (DD-API-KEY). Organization Settings → API Keys.',
              }),
              placeholder: '••••••••',
              sensitive: true,
            },
            password: {
              label: i18n.translate('connectorSpecs.datadog.auth.applicationKey.label', {
                defaultMessage: 'Application Key',
              }),
              helpText: i18n.translate(
                'connectorSpecs.datadog.auth.applicationKey.helpText',
                {
                  defaultMessage:
                    'Datadog application key (DD-APPLICATION-KEY). Organization Settings → Application Keys.',
                }
              ),
              placeholder: '••••••••',
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      site: z
        .string()
        .default('datadoghq.com')
        .describe('Datadog site hostname (e.g. datadoghq.com, datadoghq.eu)')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.datadog.config.site.label', {
            defaultMessage: 'Datadog site',
          }),
          helpText: i18n.translate('connectorSpecs.datadog.config.site.helpText', {
            defaultMessage:
              'Site hostname without scheme. US1: datadoghq.com, EU: datadoghq.eu, US3: us3.datadoghq.com',
          }),
          placeholder: 'datadoghq.com',
        }),
    })
  ),

  skill: [
    '## Datadog connector',
    '',
    'General Datadog integration. Alerting actions use Monitors + Webhooks Integration APIs;',
    'additional domains (downtimes, events, hosts, metrics, incidents) belong on this same connector.',
    '',
    '### Alerting setup',
    '1. Call `registerWebhook` with a Kibana inbound URL (placeholder OK while inbound is WIP).',
    '2. In Datadog, add `@webhook-{name}` to monitor notification messages.',
    '3. Use `listMonitors` / `getMonitor` to find monitor IDs, then `muteMonitor` / `unmuteMonitor` for write-back.',
    '',
    '### Fingerprint notes (alerting)',
    'Webhook payload includes monitor_id ($ALERT_ID) and groups ($ALERT_SCOPE) — Keep-aligned series identity.',
  ].join('\n'),

  actions: {
    registerWebhook: {
      isTool: true,
      description:
        'Create a Datadog webhook integration that POSTs monitor alerts to a URL (Kibana inbound). ' +
        'Returns the created webhook name. Monitors must mention @webhook-{name} to fire it.',
      input: RegisterWebhookInputSchema,
      handler: async (ctx, input: RegisterWebhookInput) => {
        const body: Record<string, string> = {
          name: input.name,
          url: input.url,
          payload: DATADOG_WEBHOOK_PAYLOAD_TEMPLATE,
        };
        if (input.customAuthHeader) {
          body.custom_headers = JSON.stringify({
            Authorization: `Bearer ${input.customAuthHeader}`,
          });
        }
        const response = await ctx.client.post(
          `${getBaseUrl(ctx)}/api/v1/integration/webhooks/configuration/webhooks`,
          body,
          { headers: getDdHeaders(ctx) }
        );
        return {
          name: response.data?.name ?? input.name,
          url: response.data?.url ?? input.url,
          raw: response.data,
        };
      },
    },

    getWebhook: {
      isTool: true,
      description: 'Fetch a Datadog webhook integration by name to verify registration.',
      input: WebhookNameInputSchema,
      handler: async (ctx, input: WebhookNameInput) => {
        const response = await ctx.client.get(
          `${getBaseUrl(ctx)}/api/v1/integration/webhooks/configuration/webhooks/${encodeURIComponent(
            input.name
          )}`,
          { headers: getDdHeaders(ctx) }
        );
        return response.data;
      },
    },

    deleteWebhook: {
      isTool: true,
      description: 'Delete a Datadog webhook integration by name.',
      input: WebhookNameInputSchema,
      handler: async (ctx, input: WebhookNameInput) => {
        await ctx.client.delete(
          `${getBaseUrl(ctx)}/api/v1/integration/webhooks/configuration/webhooks/${encodeURIComponent(
            input.name
          )}`,
          { headers: getDdHeaders(ctx) }
        );
        return { deleted: true, name: input.name };
      },
    },

    muteMonitor: {
      isTool: true,
      description:
        'Mute a Datadog monitor (optionally for a scope / until an end time). Use after listing monitors to get an ID.',
      input: MuteMonitorInputSchema,
      handler: async (ctx, input: MuteMonitorInput) => {
        const body: Record<string, unknown> = {};
        if (input.scope) body.scope = input.scope;
        if (input.end !== undefined) body.end = input.end;
        const response = await ctx.client.post(
          `${getBaseUrl(ctx)}/api/v1/monitor/${input.monitorId}/mute`,
          body,
          { headers: getDdHeaders(ctx) }
        );
        return {
          id: response.data?.id ?? input.monitorId,
          overallState: response.data?.overall_state,
          matchingDowntimes: response.data?.matching_downtimes,
          raw: response.data,
        };
      },
    },

    unmuteMonitor: {
      isTool: true,
      description: 'Unmute a previously muted Datadog monitor.',
      input: UnmuteMonitorInputSchema,
      handler: async (ctx, input: UnmuteMonitorInput) => {
        const response = await ctx.client.post(
          `${getBaseUrl(ctx)}/api/v1/monitor/${input.monitorId}/unmute`,
          {},
          { headers: getDdHeaders(ctx) }
        );
        return {
          id: response.data?.id ?? input.monitorId,
          overallState: response.data?.overall_state,
          raw: response.data,
        };
      },
    },

    getMonitor: {
      isTool: true,
      description: 'Get a Datadog monitor by ID, including matching downtimes.',
      input: GetMonitorInputSchema,
      handler: async (ctx, input: GetMonitorInput) => {
        const response = await ctx.client.get(
          `${getBaseUrl(ctx)}/api/v1/monitor/${input.monitorId}`,
          {
            headers: getDdHeaders(ctx),
            params: { with_downtimes: true },
          }
        );
        return {
          id: response.data.id,
          name: response.data.name,
          type: response.data.type,
          query: response.data.query,
          overallState: response.data.overall_state,
          tags: response.data.tags,
          matchingDowntimes: response.data.matching_downtimes,
          raw: response.data,
        };
      },
    },

    listMonitors: {
      isTool: true,
      description:
        'List Datadog monitors with optional name/tags/state filters. Use to find IDs before mute/unmute.',
      input: ListMonitorsInputSchema,
      handler: async (ctx, input: ListMonitorsInput) => {
        const response = await ctx.client.get(`${getBaseUrl(ctx)}/api/v1/monitor`, {
          headers: getDdHeaders(ctx),
          params: {
            name: input.name,
            tags: input.tags,
            group_states: input.groupStates,
            page: input.page ?? 0,
            page_size: input.pageSize ?? 100,
          },
        });
        const monitors = Array.isArray(response.data) ? response.data : [];
        return {
          count: monitors.length,
          monitors: monitors.map((m: Record<string, unknown>) => ({
            id: m.id,
            name: m.name,
            overallState: m.overall_state,
            tags: m.tags,
            type: m.type,
          })),
        };
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.datadog.test.description', {
      defaultMessage: 'Validates Datadog API Key and Application Key',
    }),
    handler: async (ctx) => {
      const headers = getDdHeaders(ctx);
      const base = getBaseUrl(ctx);
      // Validate API key
      await ctx.client.get(`${base}/api/v1/validate`, { headers });
      // Validate application key (requires app key on monitor list)
      await ctx.client.get(`${base}/api/v1/monitor`, {
        headers,
        params: { page_size: 1 },
      });
      return {
        ok: true,
        message: `Successfully connected to Datadog API (${getSite(ctx)})`,
        site: getSite(ctx),
      };
    },
  },
};
