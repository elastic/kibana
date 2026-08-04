/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Prometheus Alertmanager Connector
 *
 * Talks to a self-hosted Prometheus Alertmanager's HTTP API v2 so a workflow
 * can read alerts and drive the silence lifecycle (create, expire, list, get)
 * to mute noise during maintenance or a known incident. Optionally also talks
 * to the Prometheus server HTTP API (a separate, related service) to enrich
 * an alert with a live metric value or inspect the rules that produce alerts.
 *
 * https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
 * https://prometheus.io/docs/prometheus/latest/querying/api/
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  ListAlertsInputSchema,
  ListSilencesInputSchema,
  GetSilenceInputSchema,
  CreateSilenceInputSchema,
  ExpireSilenceInputSchema,
  ListAlertGroupsInputSchema,
  CreateAlertsInputSchema,
  GetStatusInputSchema,
  QueryPrometheusInputSchema,
  ListPrometheusAlertsInputSchema,
  ListPrometheusRulesInputSchema,
} from './types';
import type {
  ListAlertsInput,
  ListSilencesInput,
  GetSilenceInput,
  CreateSilenceInput,
  ExpireSilenceInput,
  ListAlertGroupsInput,
  CreateAlertsInput,
  QueryPrometheusInput,
  ListPrometheusRulesInput,
  AlertmanagerStatus,
} from './types';

/**
 * Alertmanager's `matcher` schema marks `isRegex` as a *required* body field
 * (confirmed live: omitting it returns a 422 "matchers.0.isRegex in body is
 * required"), even though a literal-match default is the overwhelmingly
 * common case. Default it here so callers can omit it for the common case.
 */
const normalizeMatchers = (
  matchers: CreateSilenceInput['matchers']
): Array<Record<string, unknown>> =>
  matchers.map(({ isRegex, ...rest }) => ({ ...rest, isRegex: isRegex ?? false }));

const buildBaseUrl = (ctx: ActionContext): string => {
  const baseUrl = ((ctx.config?.baseUrl as string | undefined) ?? '').trim();
  if (!baseUrl) {
    throw new Error(
      'Prometheus Alertmanager connector is missing the required Alertmanager URL configuration field.'
    );
  }
  return baseUrl.replace(/\/+$/, '');
};

const buildPrometheusUrl = (ctx: ActionContext): string => {
  const prometheusUrl = ((ctx.config?.prometheusUrl as string | undefined) ?? '').trim();
  if (!prometheusUrl) {
    throw new Error(
      'This action requires the optional "Prometheus server URL" field to be set on this connector — it is separate from the Alertmanager URL.'
    );
  }
  return prometheusUrl.replace(/\/+$/, '');
};

function formatAlertmanagerError(action: string, error: unknown): Error {
  const err = error as AxiosError<string | { message?: string; error?: string }>;
  const data = err.response?.data;
  const detail =
    typeof data === 'string' && data.trim().length > 0
      ? data
      : (data as { message?: string; error?: string } | undefined)?.message ??
        (data as { message?: string; error?: string } | undefined)?.error ??
        err.message;
  return new Error(
    `Alertmanager ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

function formatPrometheusError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ status?: string; errorType?: string; error?: string }>;
  const data = err.response?.data;
  const detail = data?.error ?? err.message;
  return new Error(
    `Prometheus ${action} failed (status ${err.response?.status ?? 'unknown'})${
      data?.errorType ? ` [${data.errorType}]` : ''
    }: ${detail}`
  );
}

/**
 * GitHub team that owns this connector. Read by `generate_connector_registries.ts` to keep
 * `.github/CODEOWNERS` in sync — do not remove.
 */
export const OWNER = '@elastic/nightshift-context-and-research-team';

export const PrometheusAlertmanager: ConnectorSpec = {
  metadata: {
    id: '.prometheus_alertmanager',
    displayName: 'Prometheus Alertmanager',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.prometheusAlertmanager.metadata.description',
      {
        defaultMessage:
          'Read Alertmanager alerts and alert groups, and create, list, and expire silences to mute noise',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'basic',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            username: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.prometheusAlertmanager.auth.basic.usernameLabel',
                { defaultMessage: 'Username' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.prometheusAlertmanager.auth.basic.usernameHelpText',
                {
                  defaultMessage:
                    'The username configured for HTTP basic auth on the Alertmanager instance (basic_auth_users in its web.config.file, or a reverse proxy in front of it).',
                }
              ),
            },
            password: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.prometheusAlertmanager.auth.basic.passwordLabel',
                { defaultMessage: 'Password' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.prometheusAlertmanager.auth.basic.passwordHelpText',
                {
                  defaultMessage: 'The password for the account above.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: UISchemas.url('https://alertmanager.example.com')
        .describe('The base URL of the Alertmanager instance.')
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.prometheusAlertmanager.config.baseUrl.label',
            { defaultMessage: 'Alertmanager URL' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.prometheusAlertmanager.config.baseUrl.helpText',
            {
              defaultMessage:
                'The base URL of your self-hosted Alertmanager instance, e.g. https://alertmanager.example.com. Must be reachable from Kibana.',
            }
          ),
          validate: { allowedHosts: true },
        }),
      prometheusUrl: UISchemas.url('https://prometheus.example.com')
        .optional()
        .describe(
          'Optional Prometheus server URL, for the queryPrometheus, listPrometheusAlerts, and listPrometheusRules actions.'
        )
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.prometheusAlertmanager.config.prometheusUrl.label',
            { defaultMessage: 'Prometheus server URL (optional)' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.prometheusAlertmanager.config.prometheusUrl.helpText',
            {
              defaultMessage:
                'Optional. The base URL of the Prometheus server associated with this Alertmanager, e.g. https://prometheus.example.com. Only required to enrich alerts with live metric data or inspect alerting/recording rules — reuses the same username and password as Alertmanager. Leave empty if not needed.',
            }
          ),
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl', 'prometheusUrl'],
  },

  actions: {
    listAlerts: {
      isTool: true,
      description:
        'List current Alertmanager alerts, optionally filtered by active/silenced/inhibited/unprocessed state, label matchers, or receiver. The primary read path into Alertmanager for triage and routing decisions.',
      input: ListAlertsInputSchema,
      handler: async (ctx, input: ListAlertsInput) => {
        const params: Record<string, boolean | string | string[]> = {};
        if (input.active !== undefined) params.active = input.active;
        if (input.silenced !== undefined) params.silenced = input.silenced;
        if (input.inhibited !== undefined) params.inhibited = input.inhibited;
        if (input.unprocessed !== undefined) params.unprocessed = input.unprocessed;
        if (input.filter) params.filter = input.filter;
        if (input.receiver) params.receiver = input.receiver;
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/v2/alerts`, {
            params,
            // Alertmanager's `filter` param uses Swagger's collectionFormat: multi,
            // i.e. the repeated `?filter=a&filter=b` form, not axios's default
            // bracketed `filter[]=a` form.
            paramsSerializer: { indexes: null },
          });
          return { alerts: response.data };
        } catch (error) {
          throw formatAlertmanagerError('listAlerts', error);
        }
      },
    },

    listSilences: {
      isTool: true,
      description:
        'List Alertmanager silences (active, pending, and expired), optionally filtered by label matchers. Use this to check what is already muted before creating a new silence.',
      input: ListSilencesInputSchema,
      handler: async (ctx, input: ListSilencesInput) => {
        const params: Record<string, string[]> = {};
        if (input.filter) params.filter = input.filter;
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/v2/silences`, {
            params,
            paramsSerializer: { indexes: null },
          });
          return { silences: response.data };
        } catch (error) {
          throw formatAlertmanagerError('listSilences', error);
        }
      },
    },

    getSilence: {
      isTool: true,
      description:
        'Get a single Alertmanager silence by ID, returning its matchers, time window, and state (pending, active, or expired).',
      input: GetSilenceInputSchema,
      handler: async (ctx, input: GetSilenceInput) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v2/silence/${encodeURIComponent(input.silenceId)}`
          );
          return response.data;
        } catch (error) {
          throw formatAlertmanagerError('getSilence', error);
        }
      },
    },

    createSilence: {
      isTool: true,
      description:
        'Create an Alertmanager silence to mute alerts matching label matchers for a time window. Returns the new silence ID. The core action for suppressing noise during a maintenance window or a known incident.',
      input: CreateSilenceInputSchema,
      handler: async (ctx, input: CreateSilenceInput) => {
        try {
          const response = await ctx.client.post(`${buildBaseUrl(ctx)}/api/v2/silences`, {
            matchers: normalizeMatchers(input.matchers),
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            createdBy: input.createdBy,
            comment: input.comment,
          });
          return response.data;
        } catch (error) {
          throw formatAlertmanagerError('createSilence', error);
        }
      },
    },

    expireSilence: {
      isTool: true,
      description:
        'Expire an Alertmanager silence by ID so the alerts it was muting can fire again. Closes the mute-and-restore loop once a maintenance window or incident is resolved.',
      input: ExpireSilenceInputSchema,
      handler: async (ctx, input: ExpireSilenceInput) => {
        try {
          await ctx.client.delete(
            `${buildBaseUrl(ctx)}/api/v2/silence/${encodeURIComponent(input.silenceId)}`
          );
          return { expired: true, silenceId: input.silenceId };
        } catch (error) {
          throw formatAlertmanagerError('expireSilence', error);
        }
      },
    },

    listAlertGroups: {
      isTool: true,
      description:
        'List Alertmanager alerts grouped by their routing labels, optionally filtered by state or label matchers. Use this instead of listAlerts to reason about correlated incidents rather than individual alerts.',
      input: ListAlertGroupsInputSchema,
      handler: async (ctx, input: ListAlertGroupsInput) => {
        const params: Record<string, boolean | string | string[]> = {};
        if (input.active !== undefined) params.active = input.active;
        if (input.silenced !== undefined) params.silenced = input.silenced;
        if (input.inhibited !== undefined) params.inhibited = input.inhibited;
        if (input.muted !== undefined) params.muted = input.muted;
        if (input.filter) params.filter = input.filter;
        if (input.receiver) params.receiver = input.receiver;
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/v2/alerts/groups`, {
            params,
            paramsSerializer: { indexes: null },
          });
          return { groups: response.data };
        } catch (error) {
          throw formatAlertmanagerError('listAlertGroups', error);
        }
      },
    },

    createAlerts: {
      isTool: true,
      description:
        'Push one or more synthetic alerts into Alertmanager. The alerts enter normal routing and notification, so a workflow can raise its own alert (e.g. to page on a condition Prometheus itself cannot observe).',
      input: CreateAlertsInputSchema,
      handler: async (ctx, input: CreateAlertsInput) => {
        try {
          await ctx.client.post(`${buildBaseUrl(ctx)}/api/v2/alerts`, input.alerts);
          return { created: input.alerts.length };
        } catch (error) {
          throw formatAlertmanagerError('createAlerts', error);
        }
      },
    },

    getStatus: {
      isTool: true,
      description:
        'Read the Alertmanager instance status: version, uptime, cluster peers, and the currently loaded configuration. Use this as a health check or a gating step before other actions.',
      input: GetStatusInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/v2/status`);
          return response.data;
        } catch (error) {
          throw formatAlertmanagerError('getStatus', error);
        }
      },
    },

    queryPrometheus: {
      isTool: true,
      description:
        'Run a PromQL instant query against the configured Prometheus server and return the current value(s). Use this to enrich an Alertmanager alert with live metric data before deciding how to act. Requires the optional "Prometheus server URL" connector field.',
      input: QueryPrometheusInputSchema,
      handler: async (ctx, input: QueryPrometheusInput) => {
        const params: Record<string, string> = { query: input.query };
        if (input.time) params.time = input.time;
        try {
          const response = await ctx.client.get(`${buildPrometheusUrl(ctx)}/api/v1/query`, {
            params,
          });
          return response.data;
        } catch (error) {
          throw formatPrometheusError('queryPrometheus', error);
        }
      },
    },

    listPrometheusAlerts: {
      isTool: true,
      description:
        'List firing and pending alerts as seen directly by the Prometheus server, before they reach Alertmanager. Use this to inspect the pre-Alertmanager alert state (e.g. to see a "pending" alert that has not started firing yet). Requires the optional "Prometheus server URL" connector field.',
      input: ListPrometheusAlertsInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(`${buildPrometheusUrl(ctx)}/api/v1/alerts`);
          return response.data;
        } catch (error) {
          throw formatPrometheusError('listPrometheusAlerts', error);
        }
      },
    },

    listPrometheusRules: {
      isTool: true,
      description:
        'List the alerting and recording rules currently loaded by the Prometheus server, including each alerting rule\'s currently active alerts. Use this to inspect what conditions produce an alert. Requires the optional "Prometheus server URL" connector field.',
      input: ListPrometheusRulesInputSchema,
      handler: async (ctx, input: ListPrometheusRulesInput) => {
        const params: Record<string, string | string[]> = {};
        if (input.type) params.type = input.type;
        if (input.ruleName) params['rule_name[]'] = input.ruleName;
        if (input.ruleGroup) params['rule_group[]'] = input.ruleGroup;
        try {
          const response = await ctx.client.get(`${buildPrometheusUrl(ctx)}/api/v1/rules`, {
            params,
            // Prometheus expects the literal repeated key `rule_name[]=a&rule_name[]=b`
            // (the brackets are part of the parameter name itself, per the Prometheus
            // HTTP API docs), so the keys above already include `[]` and must not be
            // further bracketed/indexed by the serializer.
            paramsSerializer: { indexes: null },
          });
          return response.data;
        } catch (error) {
          throw formatPrometheusError('listPrometheusRules', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate(
      'core.kibanaConnectorSpecs.prometheusAlertmanager.test.description',
      {
        defaultMessage: 'Verifies the connection by reading the Alertmanager instance status',
      }
    ),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/v2/status`);
        const status = response.data as AlertmanagerStatus;
        return {
          ok: true,
          message: `Successfully connected to Alertmanager ${
            status.versionInfo?.version ?? ''
          } (cluster status: ${status.cluster?.status ?? 'unknown'}).`,
        };
      } catch (error) {
        throw formatAlertmanagerError('test', error);
      }
    },
  },

  skill: [
    '## Prometheus Alertmanager Connector',
    '',
    "Alertmanager's core lifecycle primitive is the silence: mute a set of matching alerts for a time",
    'window, then let it expire (or expire it early) to allow them to fire again.',
    '',
    '### Reading alerts',
    'Use listAlerts as the primary read path for current alerts, filterable by active/silenced/inhibited/',
    'unprocessed state and by label matcher expressions (e.g. \'alertname="HighCPU"\'). Use listAlertGroups',
    'instead when you want alerts grouped by routing label — better for reasoning about a correlated',
    'incident rather than individual alerts.',
    '',
    '### The silence lifecycle',
    '1. Call listSilences (optionally with matcher filters) to check whether the target alert is already',
    '   muted before creating a new silence.',
    '2. Call createSilence with matchers, an RFC3339 startsAt/endsAt window, a comment explaining why, and',
    '   createdBy identifying who/what requested it. It returns a silence id.',
    '3. Call getSilence with that id to verify or re-check its matchers, window, and state (pending, active,',
    '   or expired).',
    '4. Once the underlying issue is resolved, call expireSilence with the id to let matching alerts fire',
    '   again immediately, rather than waiting for endsAt.',
    '',
    '### Raising your own alerts',
    'Use createAlerts to push one or more synthetic alerts (each needs at least an "alertname" label) into',
    'Alertmanager so they follow normal routing and notification — e.g. to page on a condition your',
    'workflow observed that Prometheus itself cannot evaluate as a rule.',
    '',
    '### Prometheus enrichment (optional)',
    'queryPrometheus, listPrometheusAlerts, and listPrometheusRules talk to the Prometheus server directly',
    '(not Alertmanager) and require the connector\'s optional "Prometheus server URL" field to be set. Use',
    'queryPrometheus with a PromQL expression to pull a live metric value while triaging an alert — for',
    'example, before silencing a "DiskSpaceLow" alert, query the current disk usage to confirm it is still',
    'a real problem. Use listPrometheusRules to see the rule (and its PromQL condition) that produced an',
    'alert in the first place.',
  ].join('\n'),
};
