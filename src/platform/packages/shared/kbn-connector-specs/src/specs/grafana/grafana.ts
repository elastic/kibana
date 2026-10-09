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
import { UISchemas } from '../../connector_spec';
import {
  GrafanaGetAlertsInputSchema,
  GrafanaListRulesInputSchema,
  GrafanaGetAlertRuleInputSchema,
  GrafanaListSilencesInputSchema,
  GrafanaGetSilenceInputSchema,
  GrafanaCreateSilenceInputSchema,
  GrafanaDeleteSilenceInputSchema,
  GrafanaCreateAnnotationInputSchema,
  GrafanaUpdateAnnotationInputSchema,
  GrafanaDeleteAnnotationInputSchema,
  GrafanaListAnnotationsInputSchema,
  GrafanaSearchDashboardsInputSchema,
  GrafanaGetDashboardInputSchema,
  GrafanaListContactPointsInputSchema,
  GrafanaListMuteTimingsInputSchema,
  GrafanaGetNotificationPolicyTreeInputSchema,
  type GrafanaGetAlertsInput,
  type GrafanaGetAlertRuleInput,
  type GrafanaGetSilenceInput,
  type GrafanaCreateSilenceInput,
  type GrafanaDeleteSilenceInput,
  type GrafanaCreateAnnotationInput,
  type GrafanaUpdateAnnotationInput,
  type GrafanaDeleteAnnotationInput,
  type GrafanaListAnnotationsInput,
  type GrafanaSearchDashboardsInput,
  type GrafanaGetDashboardInput,
  type GrafanaListContactPointsInput,
} from './types';

const buildBaseUrl = (ctx: ActionContext): string => {
  const baseUrl = ((ctx.config?.baseUrl as string | undefined) ?? '').trim();
  if (!baseUrl) {
    throw new Error('Grafana connector is missing the required baseUrl configuration field.');
  }
  return baseUrl.replace(/\/+$/, '');
};

const buildHeaders = (ctx: ActionContext): Record<string, string> => {
  const orgId = ctx.config?.orgId as string | number | undefined;
  return orgId !== undefined && orgId !== '' ? { 'X-Grafana-Org-Id': String(orgId) } : {};
};

function formatGrafanaError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ message?: string; error?: string }>;
  const detail = err.response?.data?.message ?? err.response?.data?.error ?? err.message;
  return new Error(
    `Grafana ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

export const Grafana: ConnectorSpec = {
  metadata: {
    id: '.grafana',
    displayName: 'Grafana',
    description: i18n.translate('core.kibanaConnectorSpecs.grafana.metadata.description', {
      defaultMessage:
        'Read Grafana-managed alerts and rules, manage silences, post dashboard annotations, and search dashboards and notification configuration.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        isRecommended: true,
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate('core.kibanaConnectorSpecs.grafana.auth.bearer.token.label', {
                defaultMessage: 'Service Account Token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.grafana.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Grafana service account token (Administration > Users and access > Service accounts). Grafana Cloud tokens are typically prefixed glsa_.',
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
      baseUrl: UISchemas.url('https://your-stack.grafana.net')
        .describe('Grafana instance URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.grafana.config.baseUrl.label', {
            defaultMessage: 'Grafana instance URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.grafana.config.baseUrl.helpText', {
            defaultMessage:
              'The base URL of your Grafana instance, e.g. https://your-stack.grafana.net (Grafana Cloud) or https://grafana.example.com (self-hosted).',
          }),
        }),
      orgId: z
        .string()
        .max(20)
        .optional()
        .describe('Organization ID to scope requests to, for multi-org Grafana instances')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.grafana.config.orgId.label', {
            defaultMessage: 'Organization ID',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.grafana.config.orgId.helpText', {
            defaultMessage:
              "Optional. Sent as the X-Grafana-Org-Id header on every request. Leave empty to use the token's default organization.",
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  actions: {
    getAlerts: {
      isTool: true,
      description:
        'Fetch currently firing, pending, silenced, and inhibited alerts from Grafana-managed Alertmanager. The primary read path into Grafana alerting.',
      input: GrafanaGetAlertsInputSchema,
      handler: async (ctx, input: GrafanaGetAlertsInput) => {
        const params: Record<string, boolean> = {};
        if (input.active !== undefined) params.active = input.active;
        if (input.silenced !== undefined) params.silenced = input.silenced;
        if (input.inhibited !== undefined) params.inhibited = input.inhibited;
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/alertmanager/grafana/api/v2/alerts`,
            { params, headers: buildHeaders(ctx) }
          );
          return { alerts: response.data };
        } catch (error) {
          throw formatGrafanaError('getAlerts', error);
        }
      },
    },

    listRules: {
      isTool: true,
      description:
        'List all configured Grafana alert rules across folders and groups, so a workflow can inventory or reference rules.',
      input: GrafanaListRulesInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v1/provisioning/alert-rules`,
            { headers: buildHeaders(ctx) }
          );
          return { rules: response.data };
        } catch (error) {
          throw formatGrafanaError('listRules', error);
        }
      },
    },

    getAlertRule: {
      isTool: true,
      description:
        'Get a single Grafana alert rule by UID, including its condition, labels, and notification settings, so a workflow can inspect exactly what fired.',
      input: GrafanaGetAlertRuleInputSchema,
      handler: async (ctx, input: GrafanaGetAlertRuleInput) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v1/provisioning/alert-rules/${encodeURIComponent(input.uid)}`,
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('getAlertRule', error);
        }
      },
    },

    listSilences: {
      isTool: true,
      description:
        'List active and pending Grafana silences, so a workflow can check whether an alert is already muted before acting.',
      input: GrafanaListSilencesInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/alertmanager/grafana/api/v2/silences`,
            { headers: buildHeaders(ctx) }
          );
          return { silences: response.data };
        } catch (error) {
          throw formatGrafanaError('listSilences', error);
        }
      },
    },

    getSilence: {
      isTool: true,
      description: 'Get a single Grafana silence by ID, returning its matchers and expiry.',
      input: GrafanaGetSilenceInputSchema,
      handler: async (ctx, input: GrafanaGetSilenceInput) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/alertmanager/grafana/api/v2/silence/${encodeURIComponent(
              input.silenceId
            )}`,
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('getSilence', error);
        }
      },
    },

    createSilence: {
      isTool: true,
      description:
        'Create a Grafana silence to mute alerts matching label matchers for a time window, so a workflow can suppress noise during maintenance or auto-remediation.',
      input: GrafanaCreateSilenceInputSchema,
      handler: async (ctx, input: GrafanaCreateSilenceInput) => {
        try {
          const response = await ctx.client.post(
            `${buildBaseUrl(ctx)}/api/alertmanager/grafana/api/v2/silences`,
            {
              matchers: input.matchers,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              comment: input.comment,
              createdBy: input.createdBy,
            },
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('createSilence', error);
        }
      },
    },

    deleteSilence: {
      isTool: true,
      description:
        'Expire a Grafana silence so matching alerts can fire again, closing the mute-and-restore loop once work completes.',
      input: GrafanaDeleteSilenceInputSchema,
      handler: async (ctx, input: GrafanaDeleteSilenceInput) => {
        try {
          await ctx.client.delete(
            `${buildBaseUrl(ctx)}/api/alertmanager/grafana/api/v2/silence/${encodeURIComponent(
              input.silenceId
            )}`,
            { headers: buildHeaders(ctx) }
          );
          return { deleted: true, silenceId: input.silenceId };
        } catch (error) {
          throw formatGrafanaError('deleteSilence', error);
        }
      },
    },

    listAnnotations: {
      isTool: true,
      description:
        'List Grafana annotations, filterable by dashboard, tags, and time range, so a workflow can find the annotationId of an annotation posted earlier (e.g. to resolve/clean up an incident annotation) instead of relying on an ID from an earlier createAnnotation response.',
      input: GrafanaListAnnotationsInputSchema,
      handler: async (ctx, input: GrafanaListAnnotationsInput) => {
        const params: Record<string, string | number | string[]> = {};
        if (input.dashboardUID) params.dashboardUID = input.dashboardUID;
        if (input.tags) params.tags = input.tags;
        if (input.from !== undefined) params.from = input.from;
        if (input.to !== undefined) params.to = input.to;
        if (input.limit) params.limit = input.limit;
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/annotations`, {
            params,
            // Grafana's /api/annotations expects the repeated `?tags=a&tags=b` form, same as /api/search.
            paramsSerializer: { indexes: null },
            headers: buildHeaders(ctx),
          });
          return { annotations: response.data };
        } catch (error) {
          throw formatGrafanaError('listAnnotations', error);
        }
      },
    },

    createAnnotation: {
      isTool: true,
      description:
        'Post a Grafana dashboard annotation (deploy, remediation ran, incident opened) so operators see workflow context. Pass timeEnd to create a region/range annotation instead of a point-in-time marker.',
      input: GrafanaCreateAnnotationInputSchema,
      handler: async (ctx, input: GrafanaCreateAnnotationInput) => {
        const body: Record<string, unknown> = { text: input.text };
        if (input.dashboardUID) body.dashboardUID = input.dashboardUID;
        if (input.panelId !== undefined) body.panelId = input.panelId;
        if (input.time !== undefined) body.time = input.time;
        if (input.timeEnd !== undefined) body.timeEnd = input.timeEnd;
        if (input.tags) body.tags = input.tags;
        try {
          const response = await ctx.client.post(`${buildBaseUrl(ctx)}/api/annotations`, body, {
            headers: buildHeaders(ctx),
          });
          return response.data;
        } catch (error) {
          throw formatGrafanaError('createAnnotation', error);
        }
      },
    },

    updateAnnotation: {
      isTool: true,
      description:
        'Update an existing Grafana annotation (text, tags, or time range) — for example, set timeEnd to mark an incident resolved.',
      input: GrafanaUpdateAnnotationInputSchema,
      handler: async (ctx, input: GrafanaUpdateAnnotationInput) => {
        const body: Record<string, unknown> = {};
        if (input.text !== undefined) body.text = input.text;
        if (input.tags !== undefined) body.tags = input.tags;
        if (input.time !== undefined) body.time = input.time;
        if (input.timeEnd !== undefined) body.timeEnd = input.timeEnd;
        try {
          const response = await ctx.client.patch(
            `${buildBaseUrl(ctx)}/api/annotations/${input.annotationId}`,
            body,
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('updateAnnotation', error);
        }
      },
    },

    deleteAnnotation: {
      isTool: true,
      description: 'Delete a Grafana annotation for cleanup or false-positive correction.',
      input: GrafanaDeleteAnnotationInputSchema,
      handler: async (ctx, input: GrafanaDeleteAnnotationInput) => {
        try {
          await ctx.client.delete(`${buildBaseUrl(ctx)}/api/annotations/${input.annotationId}`, {
            headers: buildHeaders(ctx),
          });
          return { deleted: true, annotationId: input.annotationId };
        } catch (error) {
          throw formatGrafanaError('deleteAnnotation', error);
        }
      },
    },

    searchDashboards: {
      isTool: true,
      description:
        'Search Grafana dashboards and folders by query string or tag, so a workflow can resolve the dashboard UID it needs to link or annotate.',
      input: GrafanaSearchDashboardsInputSchema,
      handler: async (ctx, input: GrafanaSearchDashboardsInput) => {
        const params: Record<string, string | number | boolean | string[]> = {};
        if (input.query) params.query = input.query;
        if (input.tag) params.tag = input.tag;
        if (input.type) params.type = input.type;
        if (input.starred !== undefined) params.starred = input.starred;
        if (input.limit) params.limit = input.limit;
        if (input.page) params.page = input.page;
        try {
          const response = await ctx.client.get(`${buildBaseUrl(ctx)}/api/search`, {
            params,
            // Grafana's /api/search expects the repeated `?tag=a&tag=b` form; axios's
            // default array serialization (`tag[]=a`) is not parsed by Grafana.
            paramsSerializer: { indexes: null },
            headers: buildHeaders(ctx),
          });
          return { results: response.data };
        } catch (error) {
          throw formatGrafanaError('searchDashboards', error);
        }
      },
    },

    getDashboard: {
      isTool: true,
      description:
        'Get a Grafana dashboard by UID, returning its metadata and panels for linking/context.',
      input: GrafanaGetDashboardInputSchema,
      handler: async (ctx, input: GrafanaGetDashboardInput) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/dashboards/uid/${encodeURIComponent(input.uid)}`,
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('getDashboard', error);
        }
      },
    },

    listContactPoints: {
      isTool: true,
      description: 'List configured Grafana contact points (notification targets).',
      input: GrafanaListContactPointsInputSchema,
      handler: async (ctx, input: GrafanaListContactPointsInput) => {
        const params: Record<string, string> = {};
        if (input.name) params.name = input.name;
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v1/provisioning/contact-points`,
            { params, headers: buildHeaders(ctx) }
          );
          return { contactPoints: response.data };
        } catch (error) {
          throw formatGrafanaError('listContactPoints', error);
        }
      },
    },

    listMuteTimings: {
      isTool: true,
      description:
        'List Grafana mute timings (recurring silence schedules) to reference in notification-policy logic.',
      input: GrafanaListMuteTimingsInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v1/provisioning/mute-timings`,
            { headers: buildHeaders(ctx) }
          );
          return { muteTimings: response.data };
        } catch (error) {
          throw formatGrafanaError('listMuteTimings', error);
        }
      },
    },

    getNotificationPolicyTree: {
      isTool: true,
      description:
        "Read Grafana's notification policy tree, so a workflow can understand alert routing to contact points.",
      input: GrafanaGetNotificationPolicyTreeInputSchema,
      handler: async (ctx) => {
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/api/v1/provisioning/policies`,
            { headers: buildHeaders(ctx) }
          );
          return response.data;
        } catch (error) {
          throw formatGrafanaError('getNotificationPolicyTree', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.grafana.test.description', {
      defaultMessage: 'Verifies the Grafana connection by listing configured alert rules',
    }),
    handler: async (ctx) => {
      try {
        const response = await ctx.client.get(
          `${buildBaseUrl(ctx)}/api/v1/provisioning/alert-rules`,
          { headers: buildHeaders(ctx) }
        );
        const count = Array.isArray(response.data) ? response.data.length : 0;
        return {
          message: `Successfully connected to Grafana (${count} alert rule(s) visible).`,
        };
      } catch (error) {
        throw formatGrafanaError('test', error);
      }
    },
  },

  skill: [
    'Use getAlerts as the primary read path for firing/pending alerts from Grafana-managed Alertmanager. Server-side label filtering on this endpoint is unreliable — filter the returned alerts client-side by labels if needed.',
    "Use listRules to inventory alert rules, then getAlertRule with a UID for a single rule's condition, labels, and notification settings.",
    'Before creating a silence, call listSilences (or getSilence with a known ID) to check whether the target alert is already muted.',
    'createSilence requires matchers, startsAt/endsAt (RFC3339), a comment, and createdBy — do not pass an id when creating. Use deleteSilence to expire a silence early once the underlying issue is resolved.',
    'Use createAnnotation to post workflow context (deploys, remediation runs, incident open/close) onto a dashboard; omit dashboardUID for an org-wide annotation. Pass timeEnd on createAnnotation for a range annotation, or call updateAnnotation with timeEnd afterward to mark an existing annotation resolved.',
    'Use listAnnotations (filterable by dashboardUID, tags, and from/to) to find the annotationId of an annotation posted earlier in a different session, before calling updateAnnotation or deleteAnnotation on it.',
    'Use searchDashboards to resolve a dashboard UID by title or tag before calling getDashboard or attaching an annotation to a specific dashboard/panel.',
    'listContactPoints, listMuteTimings, and getNotificationPolicyTree describe how alerts are routed — use them to answer "who gets notified" questions rather than to change alert state directly.',
  ].join('\n'),
};
