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
  PostHogListIssuesInputSchema,
  PostHogGetIssueInputSchema,
  PostHogUpdateIssueStatusInputSchema,
  PostHogAssignIssueInputSchema,
  PostHogRunQueryInputSchema,
  PostHogUpdateFeatureFlagInputSchema,
  PostHogGetFeatureFlagInputSchema,
  PostHogListFeatureFlagsInputSchema,
  PostHogCreateAnnotationInputSchema,
  PostHogListSessionRecordingsInputSchema,
  PostHogCreateExternalReferenceInputSchema,
} from './types';
import type {
  PostHogListIssuesInput,
  PostHogGetIssueInput,
  PostHogUpdateIssueStatusInput,
  PostHogAssignIssueInput,
  PostHogRunQueryInput,
  PostHogUpdateFeatureFlagInput,
  PostHogGetFeatureFlagInput,
  PostHogListFeatureFlagsInput,
  PostHogCreateAnnotationInput,
  PostHogListSessionRecordingsInput,
  PostHogCreateExternalReferenceInput,
} from './types';

const buildProjectUrl = (ctx: ActionContext, path: string): string => {
  const host = ((ctx.config?.instanceHost as string | undefined) ?? '').trim().replace(/\/+$/, '');
  const projectId = ctx.config?.projectId as string | number | undefined;
  if (!host) {
    throw new Error('PostHog connector is missing the required instanceHost configuration field.');
  }
  if (!projectId) {
    throw new Error('PostHog connector is missing the required projectId configuration field.');
  }
  return `${host}/api/projects/${encodeURIComponent(projectId)}${path}`;
};

function formatPostHogError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ detail?: string; message?: string }>;
  const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;
  return new Error(
    `PostHog ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

export const PostHog: ConnectorSpec = {
  metadata: {
    id: '.posthog',
    displayName: 'PostHog',
    description: i18n.translate('core.kibanaConnectorSpecs.posthog.metadata.description', {
      defaultMessage:
        'Triage PostHog error-tracking issues, run HogQL queries, toggle feature flags, post annotations, and look up session recordings.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // 'workflows' is added in a follow-up PR once this type reaches Production-NonCanary everywhere.
    supportedFeatureIds: ['agentBuilder'],
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
              label: i18n.translate('core.kibanaConnectorSpecs.posthog.auth.bearer.token.label', {
                defaultMessage: 'Personal API Key',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.posthog.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A PostHog personal API key (Settings > Personal API keys), scoped to error_tracking, query, feature_flag, annotation, and session_recording read/write.',
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
      instanceHost: UISchemas.url('https://us.posthog.com')
        .describe('PostHog instance URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.posthog.config.instanceHost.label', {
            defaultMessage: 'Instance host',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.posthog.config.instanceHost.helpText',
            {
              defaultMessage:
                'Your PostHog instance URL: https://us.posthog.com (US Cloud, default), https://eu.posthog.com (EU Cloud), or your self-managed instance URL.',
            }
          ),
        }),
      projectId: z
        .string()
        .max(50)
        .describe('PostHog project ID that every action runs against')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.posthog.config.projectId.label', {
            defaultMessage: 'Project ID',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.posthog.config.projectId.helpText', {
            defaultMessage: 'Found in Project Settings, or via a call to /api/projects/.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['instanceHost'],
  },

  actions: {
    listIssues: {
      isTool: true,
      description:
        'List PostHog error-tracking issues, filterable by status, assignee, and last-seen time window. The primary read path to find what needs triage.',
      input: PostHogListIssuesInputSchema,
      handler: async (ctx, input: PostHogListIssuesInput) => {
        try {
          // The plain GET /error_tracking/issues/ endpoint only supports limit/offset.
          // Filtering by status, assignee, date range, and search requires the query endpoint.
          const response = await ctx.client.post(
            buildProjectUrl(ctx, '/error_tracking/query/issues/'),
            {
              status: input.status === 'all' ? undefined : input.status,
              assignee:
                input.assigneeId && input.assigneeType
                  ? { id: input.assigneeId, type: input.assigneeType }
                  : undefined,
              dateRange:
                input.dateFrom || input.dateTo
                  ? { date_from: input.dateFrom, date_to: input.dateTo }
                  : undefined,
              searchQuery: input.searchQuery,
              orderBy: input.orderBy,
              orderDirection: input.orderDirection,
              limit: input.limit,
              offset: input.offset,
            }
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('listIssues', error);
        }
      },
    },

    getIssue: {
      isTool: true,
      description:
        'Get a single PostHog error-tracking issue by ID, including status, assignee, volume, first/last seen, and message, so a workflow can branch or enrich on it.',
      input: PostHogGetIssueInputSchema,
      handler: async (ctx, input: PostHogGetIssueInput) => {
        try {
          const response = await ctx.client.get(
            buildProjectUrl(ctx, `/error_tracking/issues/${encodeURIComponent(input.issueId)}/`)
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('getIssue', error);
        }
      },
    },

    updateIssueStatus: {
      isTool: true,
      description:
        'Move a PostHog error-tracking issue to a new status (active, resolved, archived, suppressed, or pending_release). The core lifecycle action the connector exists to drive.',
      input: PostHogUpdateIssueStatusInputSchema,
      handler: async (ctx, input: PostHogUpdateIssueStatusInput) => {
        try {
          const response = await ctx.client.patch(
            buildProjectUrl(ctx, `/error_tracking/issues/${encodeURIComponent(input.issueId)}/`),
            { status: input.status }
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('updateIssueStatus', error);
        }
      },
    },

    assignIssue: {
      isTool: true,
      description:
        'Assign or reassign a PostHog error-tracking issue to a user or role, so a workflow can route ownership as part of triage.',
      input: PostHogAssignIssueInputSchema,
      handler: async (ctx, input: PostHogAssignIssueInput) => {
        try {
          const response = await ctx.client.patch(
            buildProjectUrl(
              ctx,
              `/error_tracking/issues/${encodeURIComponent(input.issueId)}/assign/`
            ),
            { assignee: { id: input.assigneeId, type: input.assigneeType } }
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('assignIssue', error);
        }
      },
    },

    runQuery: {
      isTool: true,
      description:
        'Run a HogQL (SQL-like) query against PostHog product data and return the result rows. The general-purpose data lever for a decision or enrichment inside a workflow.',
      input: PostHogRunQueryInputSchema,
      handler: async (ctx, input: PostHogRunQueryInput) => {
        try {
          const response = await ctx.client.post(buildProjectUrl(ctx, '/query/'), {
            query: { kind: 'HogQLQuery', query: input.query },
            name: input.name,
          });
          return response.data;
        } catch (error) {
          throw formatPostHogError('runQuery', error);
        }
      },
    },

    updateFeatureFlag: {
      isTool: true,
      description:
        'Toggle a PostHog feature flag active/inactive or change its rollout percentage, giving a workflow a mitigation lever to disable or roll back a bad rollout during an incident. Changing rolloutPercentage preserves the flag\'s existing release-condition groups and their targeting properties (e.g. "internal users only"), applying the new percentage to each group rather than replacing them with a single ungated group.',
      input: PostHogUpdateFeatureFlagInputSchema,
      handler: async (ctx, input: PostHogUpdateFeatureFlagInput) => {
        try {
          const body: Record<string, unknown> = {};
          if (input.active !== undefined) body.active = input.active;
          if (input.rolloutPercentage !== undefined) {
            const current = await ctx.client.get(
              buildProjectUrl(ctx, `/feature_flags/${input.flagId}/`)
            );
            const currentFilters = (current.data as { filters?: Record<string, unknown> })?.filters;
            const existingGroups = currentFilters?.groups;
            const groups =
              Array.isArray(existingGroups) && existingGroups.length > 0
                ? existingGroups.map((group: Record<string, unknown>) => ({
                    ...group,
                    rollout_percentage: input.rolloutPercentage,
                  }))
                : [{ properties: [], rollout_percentage: input.rolloutPercentage }];
            body.filters = { ...currentFilters, groups };
          }
          const response = await ctx.client.patch(
            buildProjectUrl(ctx, `/feature_flags/${input.flagId}/`),
            body
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('updateFeatureFlag', error);
        }
      },
    },

    getFeatureFlag: {
      isTool: true,
      description:
        "Get a PostHog feature flag's current active state and rollout configuration by ID, so a workflow can decide whether to change it before calling updateFeatureFlag.",
      input: PostHogGetFeatureFlagInputSchema,
      handler: async (ctx, input: PostHogGetFeatureFlagInput) => {
        try {
          const response = await ctx.client.get(
            buildProjectUrl(ctx, `/feature_flags/${input.flagId}/`)
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('getFeatureFlag', error);
        }
      },
    },

    listFeatureFlags: {
      isTool: true,
      description:
        'List PostHog feature flags, optionally filtered by a name/key substring, so a workflow can find the flag to change during a response.',
      input: PostHogListFeatureFlagsInputSchema,
      handler: async (ctx, input: PostHogListFeatureFlagsInput) => {
        try {
          const response = await ctx.client.get(buildProjectUrl(ctx, '/feature_flags/'), {
            params: { search: input.search, limit: input.limit },
          });
          return response.data;
        } catch (error) {
          throw formatPostHogError('listFeatureFlags', error);
        }
      },
    },

    createAnnotation: {
      isTool: true,
      description:
        'Mark a deploy, incident, or config change on PostHog charts by creating an annotation at a given date, so analytics line up with the event.',
      input: PostHogCreateAnnotationInputSchema,
      handler: async (ctx, input: PostHogCreateAnnotationInput) => {
        try {
          const response = await ctx.client.post(buildProjectUrl(ctx, '/annotations/'), {
            content: input.content,
            date_marker: input.dateMarker,
            scope: input.scope,
          });
          return response.data;
        } catch (error) {
          throw formatPostHogError('createAnnotation', error);
        }
      },
    },

    listSessionRecordings: {
      isTool: true,
      description:
        'List PostHog session recordings within a time window, optionally scoped to a person, to investigate what users hit around an error.',
      input: PostHogListSessionRecordingsInputSchema,
      handler: async (ctx, input: PostHogListSessionRecordingsInput) => {
        try {
          const response = await ctx.client.get(buildProjectUrl(ctx, '/session_recordings/'), {
            params: {
              date_from: input.dateFrom,
              date_to: input.dateTo,
              person_id: input.personId,
              limit: input.limit,
            },
          });
          return response.data;
        } catch (error) {
          throw formatPostHogError('listSessionRecordings', error);
        }
      },
    },

    createExternalReference: {
      isTool: true,
      description:
        'Link a PostHog error-tracking issue to an external ticket (e.g. a Jira or GitHub issue) via a configured integration, so the issue and the external ticket stay connected for cross-tool tracking.',
      input: PostHogCreateExternalReferenceInputSchema,
      handler: async (ctx, input: PostHogCreateExternalReferenceInput) => {
        try {
          const response = await ctx.client.post(
            buildProjectUrl(ctx, '/error_tracking/external_references/'),
            {
              issue: input.issueId,
              integration_id: input.integrationId,
              config: {
                ...input.config,
                ...(input.externalUrl ? { external_url: input.externalUrl } : {}),
              },
            }
          );
          return response.data;
        } catch (error) {
          throw formatPostHogError('createExternalReference', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.posthog.test.description', {
      defaultMessage:
        'Verifies connectivity by listing error-tracking issues for the configured project.',
    }),
    handler: async (ctx) => {
      try {
        await ctx.client.get(buildProjectUrl(ctx, '/error_tracking/issues/'), {
          params: { limit: 1 },
        });
        return { message: 'Successfully connected to the PostHog API.' };
      } catch (error) {
        throw formatPostHogError('test', error);
      }
    },
  },

  skill: [
    '## PostHog Connector Usage Guide',
    '',
    '### Error Triage Flow',
    '',
    '1. Call `listIssues` with an optional `status` (e.g. "active") to find issues needing attention.',
    '2. Call `getIssue` for full detail on a candidate issue.',
    '3. Call `assignIssue` to route ownership, then `updateIssueStatus` once triaged or fixed.',
    '4. Use `listSessionRecordings` scoped to the issue time window to see what users hit.',
    '',
    '### Feature Flag Rollback',
    '',
    'Call `listFeatureFlags` or `getFeatureFlag` to find the flag responsible for a bad rollout, then `updateFeatureFlag` with `active: false` or a reduced `rolloutPercentage` to mitigate during an incident.',
    '',
    '### Enrichment',
    '',
    'Use `runQuery` with a HogQL query for ad hoc product-data enrichment, and `createAnnotation` to mark the deploy/incident/config-change event on PostHog charts.',
  ].join('\n'),
};
