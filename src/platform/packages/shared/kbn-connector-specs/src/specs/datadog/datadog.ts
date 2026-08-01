/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Datadog connector (`.datadog`)
 *
 * General Datadog integration for Workflows / Agent Builder.
 * First action group covers monitor discovery and mute/unmute write-back;
 * additional Datadog API domains (webhooks, downtimes, events, hosts,
 * metrics, incidents) should be added as actions on this same connector —
 * do not create `.datadog_*` variants for each domain.
 *
 * Auth: Datadog Personal Access Token (PAT) or Service Access Token (SAT)
 * via native `bearer` (`Authorization: Bearer <token>`). Prefer SAT for
 * automation (optional never-expire). Classic API key + application key
 * dual-header auth is not supported.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  GetMonitorInputSchema,
  ListMonitorsInputSchema,
  MuteMonitorInputSchema,
  UnmuteMonitorInputSchema,
  type GetMonitorInput,
  type ListMonitorsInput,
  type MuteMonitorInput,
  type UnmuteMonitorInput,
} from './types';

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

export const DatadogConnector: ConnectorSpec = {
  metadata: {
    id: '.datadog',
    displayName: 'Datadog',
    description: i18n.translate('connectorSpecs.datadog.metadata.description', {
      defaultMessage:
        'Manage Datadog monitors (list, get, mute, unmute); extensible for downtimes, events, hosts, metrics, and incidents',
    }),
    // gold matches classic stack action peers (.pagerduty, .webhook) and
    // threat-intel-ish specs (e.g. .virustotal); not a final packaging call.
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    // Same surface as other kbn-connector-specs peers. Do not add 'alerting'
    // until there is a real v1 rule-action params UI / default subAction —
    // specs are Workflows / Agent Builder tools today, not rule actions.
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          label: i18n.translate('connectorSpecs.datadog.auth.bearer.label', {
            defaultMessage: 'Access token (PAT / SAT)',
          }),
          meta: {
            token: {
              sensitive: true,
              label: i18n.translate('connectorSpecs.datadog.auth.bearer.token.label', {
                defaultMessage: 'Access token',
              }),
              helpText: i18n.translate('connectorSpecs.datadog.auth.bearer.token.helpText', {
                defaultMessage:
                  'A Datadog Personal Access Token (ddpat_…) or Service Access Token (ddsat_…). Prefer a Service Access Token for automation (Organization Settings → Service Accounts). Classic API key + application key pairs are not supported.',
              }),
              placeholder: 'ddsat_… or ddpat_…',
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
    'General Datadog integration. Auth with a Personal Access Token (PAT) or',
    'Service Access Token (SAT) as Bearer — prefer SAT for automation.',
    'Current actions cover monitor discovery and mute/unmute write-back;',
    'additional domains (webhooks, downtimes, events, hosts, metrics, incidents)',
    'belong on this same connector.',
    '',
    '### Monitors',
    '1. Use `listMonitors` / `getMonitor` to find monitor IDs.',
    '2. Use `muteMonitor` / `unmuteMonitor` for write-back (silence).',
    '3. For monitors currently alerting, filter with `groupStates: "alert"`.',
  ].join('\n'),

  actions: {
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
          body
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
          {}
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
    enabled: true,
    description: i18n.translate('connectorSpecs.datadog.test.description', {
      defaultMessage: 'Validates the Datadog access token (PAT or SAT)',
    }),
    handler: async (ctx) => {
      // Bearer PATs/SATs are not API keys — /api/v1/validate is the wrong probe.
      // A lightweight authenticated monitors list verifies token + scopes.
      await ctx.client.get(`${getBaseUrl(ctx)}/api/v1/monitor`, {
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
