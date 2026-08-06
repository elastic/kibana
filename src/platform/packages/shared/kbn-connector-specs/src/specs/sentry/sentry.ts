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
  SentryListIssuesInputSchema,
  SentryGetIssueInputSchema,
  SentryResolveIssueInputSchema,
  SentryIgnoreIssueInputSchema,
  SentryUnresolveIssueInputSchema,
  SentryAssignIssueInputSchema,
  SentryDeleteIssueInputSchema,
  SentryListIssueEventsInputSchema,
  SentryGetEventInputSchema,
  SentryBulkUpdateIssuesInputSchema,
  SentryListProjectsInputSchema,
  SentryListIssueAlertRulesInputSchema,
  SentryCreateIssueAlertRuleInputSchema,
  SentryUpdateIssueAlertRuleInputSchema,
  type SentryIssue,
  type SentryProject,
  type SentryListIssuesInput,
  type SentryGetIssueInput,
  type SentryResolveIssueInput,
  type SentryIgnoreIssueInput,
  type SentryUnresolveIssueInput,
  type SentryAssignIssueInput,
  type SentryDeleteIssueInput,
  type SentryListIssueEventsInput,
  type SentryGetEventInput,
  type SentryBulkUpdateIssuesInput,
  type SentryListProjectsInput,
  type SentryListIssueAlertRulesInput,
  type SentryCreateIssueAlertRuleInput,
  type SentryUpdateIssueAlertRuleInput,
} from './types';

const SENTRY_DEFAULT_BASE_URL = 'https://sentry.io/api/0';

const buildBaseUrl = (ctx: ActionContext): string => {
  const configured = (ctx.config?.baseUrl as string | undefined)?.trim();
  const baseUrl = configured && configured.length > 0 ? configured : SENTRY_DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
};

const getOrgSlug = (ctx: ActionContext): string => {
  const orgSlug = (ctx.config?.organizationSlug as string | undefined)?.trim();
  if (!orgSlug) {
    throw new Error(
      'Sentry connector is missing the required organizationSlug configuration field.'
    );
  }
  // Encode once here so every call site gets a URL-safe org slug without
  // having to remember to do it themselves.
  return encodeURIComponent(orgSlug);
};

function formatSentryError(action: string, error: unknown): Error {
  const err = error as AxiosError<{ detail?: string; error?: string }>;
  const detail = err.response?.data?.detail ?? err.response?.data?.error ?? err.message;
  return new Error(
    `Sentry ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
  );
}

// Issues and projects carry a lot of Sentry-internal noise (feature flags,
// avatar metadata, sharing settings, ...), so their list/get actions trim to
// a curated shape. Alert rules and events are already compact and purpose-
// built for their action, so those return `response.data` as-is.
const projectIssue = (issue: SentryIssue) => ({
  id: issue.id,
  shortId: issue.shortId,
  title: issue.title,
  culprit: issue.culprit,
  status: issue.status,
  level: issue.level,
  count: issue.count,
  userCount: issue.userCount,
  firstSeen: issue.firstSeen,
  lastSeen: issue.lastSeen,
  permalink: issue.permalink,
  assignedTo: issue.assignedTo,
  project: issue.project,
});

export const Sentry: ConnectorSpec = {
  metadata: {
    id: '.sentry',
    displayName: 'Sentry',
    description: i18n.translate('core.kibanaConnectorSpecs.sentry.metadata.description', {
      defaultMessage:
        'Triage Sentry issues: list, read, resolve, ignore, reopen, assign, and bulk-update error groups, provision issue alert rules, and correlate incidents to releases.',
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
              label: i18n.translate('core.kibanaConnectorSpecs.sentry.auth.bearer.token.label', {
                defaultMessage: 'Auth Token',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.sentry.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Sentry auth token with org:read, project:read, event:read, and event:write scopes (add alerts:write if you plan to provision issue alert rules, and event:admin if you plan to use deleteIssue). Create one as an internal integration (Settings > Developer Settings) or a personal auth token.',
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
      organizationSlug: z
        .string()
        .min(1)
        .max(200)
        .describe('Your Sentry organization slug')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.sentry.config.organizationSlug.label', {
            defaultMessage: 'Organization slug',
          }),
          placeholder: 'my-org',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.sentry.config.organizationSlug.helpText',
            {
              defaultMessage:
                'The slug of your Sentry organization, found in the URL: sentry.io/organizations/your-slug/',
            }
          ),
        }),
      baseUrl: UISchemas.url('https://sentry.io/api/0')
        .optional()
        .describe('Sentry API base URL')
        .meta({
          label: i18n.translate('core.kibanaConnectorSpecs.sentry.config.baseUrl.label', {
            defaultMessage: 'API base URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.sentry.config.baseUrl.helpText', {
            defaultMessage:
              'Leave empty to use Sentry SaaS (https://sentry.io/api/0). If your organization uses a region-specific data storage location, use its regional domain instead, e.g. https://us.sentry.io/api/0 or https://de.sentry.io/api/0. Set this for a self-hosted Sentry instance, e.g. https://sentry.example.com/api/0.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  actions: {
    listIssues: {
      isTool: true,
      description:
        'List Sentry issues for the organization (optionally scoped to a project), filtered by search query, environment, or time window. The primary read path for building a triage feed. Defaults to "is:unresolved" when no query is given.',
      input: SentryListIssuesInputSchema,
      handler: async (ctx, input: SentryListIssuesInput) => {
        const orgSlug = getOrgSlug(ctx);
        const params: Record<string, string | number> = {
          query: input.query ?? 'is:unresolved',
        };
        if (input.statsPeriod) params.statsPeriod = input.statsPeriod;
        if (input.environment) params.environment = input.environment;
        if (input.sort) params.sort = input.sort;
        if (input.cursor) params.cursor = input.cursor;
        if (input.limit) params.limit = input.limit;

        const baseUrl = buildBaseUrl(ctx);
        const url = input.project
          ? `${baseUrl}/projects/${orgSlug}/${encodeURIComponent(input.project)}/issues/`
          : `${baseUrl}/organizations/${orgSlug}/issues/`;

        try {
          const response = await ctx.client.get<SentryIssue[]>(url, { params });
          return { issues: response.data.map(projectIssue) };
        } catch (error) {
          throw formatSentryError('listIssues', error);
        }
      },
    },

    getIssue: {
      isTool: true,
      description:
        'Get the full record for a single Sentry issue by ID: status, culprit, event/user counts, first/last seen, and assignee. Use to enrich an alert with error detail before deciding on an action.',
      input: SentryGetIssueInputSchema,
      handler: async (ctx, input: SentryGetIssueInput) => {
        try {
          const response = await ctx.client.get<SentryIssue>(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`
          );
          return projectIssue(response.data);
        } catch (error) {
          throw formatSentryError('getIssue', error);
        }
      },
    },

    resolveIssue: {
      isTool: true,
      description:
        'Resolve a Sentry issue, the closing step of an incident workflow. Set inNextRelease to resolve conditionally on the next deploy instead of immediately.',
      input: SentryResolveIssueInputSchema,
      handler: async (ctx, input: SentryResolveIssueInput) => {
        const body = input.inNextRelease
          ? { status: 'resolvedInNextRelease' }
          : { status: 'resolved' };
        try {
          const response = await ctx.client.put<SentryIssue>(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`,
            body
          );
          return projectIssue(response.data);
        } catch (error) {
          throw formatSentryError('resolveIssue', error);
        }
      },
    },

    ignoreIssue: {
      isTool: true,
      description:
        'Ignore (archive) a noisy Sentry issue so it drops out of the default review list. Pass ignoreDuration (minutes) to auto-unignore later, or omit to ignore indefinitely.',
      input: SentryIgnoreIssueInputSchema,
      handler: async (ctx, input: SentryIgnoreIssueInput) => {
        const body: Record<string, unknown> = { status: 'ignored' };
        if (input.ignoreDuration) {
          body.statusDetails = { ignoreDuration: input.ignoreDuration };
        }
        try {
          const response = await ctx.client.put<SentryIssue>(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`,
            body
          );
          return projectIssue(response.data);
        } catch (error) {
          throw formatSentryError('ignoreIssue', error);
        }
      },
    },

    unresolveIssue: {
      isTool: true,
      description:
        'Move a Sentry issue back to unresolved. Use to re-escalate an issue on regression or a new event.',
      input: SentryUnresolveIssueInputSchema,
      handler: async (ctx, input: SentryUnresolveIssueInput) => {
        try {
          const response = await ctx.client.put<SentryIssue>(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`,
            { status: 'unresolved' }
          );
          return projectIssue(response.data);
        } catch (error) {
          throw formatSentryError('unresolveIssue', error);
        }
      },
    },

    assignIssue: {
      isTool: true,
      description:
        'Assign a Sentry issue to a user (by primary email or "user:<user-id>") or a team (using "team:<team-slug>"), so automated routing puts the error group in front of the right owner.',
      input: SentryAssignIssueInputSchema,
      handler: async (ctx, input: SentryAssignIssueInput) => {
        try {
          const response = await ctx.client.put<SentryIssue>(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`,
            { assignedTo: input.assignedTo }
          );
          return projectIssue(response.data);
        } catch (error) {
          throw formatSentryError('assignIssue', error);
        }
      },
    },

    listIssueEvents: {
      isTool: true,
      description:
        'List the events recorded under a Sentry issue, newest first. Use to inspect recurrence before deciding whether to resolve, ignore, or escalate. Pass cursor from a previous response to page further back.',
      input: SentryListIssueEventsInputSchema,
      handler: async (ctx, input: SentryListIssueEventsInput) => {
        const params: Record<string, string | boolean> = {};
        if (input.cursor) params.cursor = input.cursor;
        if (input.full !== undefined) params.full = input.full;
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/events/`,
            { params }
          );
          return { events: response.data };
        } catch (error) {
          throw formatSentryError('listIssueEvents', error);
        }
      },
    },

    getEvent: {
      isTool: true,
      description:
        'Get one Sentry event by project and event ID, including its stack trace, tags, and context. Use after listIssueEvents to inspect a specific occurrence in detail.',
      input: SentryGetEventInputSchema,
      handler: async (ctx, input: SentryGetEventInput) => {
        const orgSlug = getOrgSlug(ctx);
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/projects/${orgSlug}/${encodeURIComponent(
              input.project
            )}/events/${encodeURIComponent(input.eventId)}/`
          );
          return response.data;
        } catch (error) {
          throw formatSentryError('getEvent', error);
        }
      },
    },

    bulkUpdateIssues: {
      isTool: true,
      description:
        'Update the status and/or assignee of multiple Sentry issues in one call, so a cleanup workflow does not fan out one request per issue.',
      input: SentryBulkUpdateIssuesInputSchema,
      handler: async (ctx, input: SentryBulkUpdateIssuesInput) => {
        const orgSlug = getOrgSlug(ctx);
        const body: Record<string, unknown> = {};
        if (input.status) body.status = input.status;
        if (input.assignedTo) body.assignedTo = input.assignedTo;

        try {
          const response = await ctx.client.put(
            `${buildBaseUrl(ctx)}/projects/${orgSlug}/${encodeURIComponent(input.project)}/issues/`,
            body,
            {
              params: { id: input.issueIds },
              // Sentry expects the repeated "?id=1&id=2" form; axios's default
              // array serialization ("id[]=1&id[]=2") is rejected upstream.
              paramsSerializer: { indexes: null },
            }
          );
          return { updated: response.data };
        } catch (error) {
          throw formatSentryError('bulkUpdateIssues', error);
        }
      },
    },

    deleteIssue: {
      isTool: false,
      description:
        'Permanently delete a Sentry issue confirmed as noise or a duplicate. This is irreversible.',
      input: SentryDeleteIssueInputSchema,
      handler: async (ctx, input: SentryDeleteIssueInput) => {
        try {
          await ctx.client.delete(
            `${buildBaseUrl(ctx)}/issues/${encodeURIComponent(input.issueId)}/`
          );
          return { deleted: true, issueId: input.issueId };
        } catch (error) {
          throw formatSentryError('deleteIssue', error);
        }
      },
    },

    listProjects: {
      isTool: true,
      description:
        "List the organization's Sentry projects, so a workflow can resolve a project slug before scoping another action.",
      input: SentryListProjectsInputSchema,
      handler: async (ctx, input: SentryListProjectsInput) => {
        const orgSlug = getOrgSlug(ctx);
        const params: Record<string, string> = {};
        if (input.cursor) params.cursor = input.cursor;
        try {
          const response = await ctx.client.get<SentryProject[]>(
            `${buildBaseUrl(ctx)}/organizations/${orgSlug}/projects/`,
            { params }
          );
          return {
            projects: response.data.map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              platform: p.platform,
              status: p.status,
            })),
          };
        } catch (error) {
          throw formatSentryError('listProjects', error);
        }
      },
    },

    listIssueAlertRules: {
      isTool: true,
      description:
        'List the issue alert rules configured on a Sentry project, so an onboarding workflow can audit existing monitor coverage.',
      input: SentryListIssueAlertRulesInputSchema,
      handler: async (ctx, input: SentryListIssueAlertRulesInput) => {
        const orgSlug = getOrgSlug(ctx);
        const params: Record<string, string> = {};
        if (input.cursor) params.cursor = input.cursor;
        try {
          const response = await ctx.client.get(
            `${buildBaseUrl(ctx)}/projects/${orgSlug}/${encodeURIComponent(input.project)}/rules/`,
            { params }
          );
          return { rules: response.data };
        } catch (error) {
          throw formatSentryError('listIssueAlertRules', error);
        }
      },
    },

    createIssueAlertRule: {
      isTool: true,
      description:
        "Create a new issue alert rule on a Sentry project, so an onboarding workflow can provision monitor coverage for a new service. Conditions/actions use Sentry's rule id catalog (see the Sentry issue alert rule docs).",
      input: SentryCreateIssueAlertRuleInputSchema,
      handler: async (ctx, input: SentryCreateIssueAlertRuleInput) => {
        const orgSlug = getOrgSlug(ctx);
        try {
          const response = await ctx.client.post(
            `${buildBaseUrl(ctx)}/projects/${orgSlug}/${encodeURIComponent(input.project)}/rules/`,
            {
              name: input.name,
              actionMatch: input.actionMatch,
              conditions: input.conditions,
              actions: input.actions,
              frequency: input.frequency ?? 30,
            }
          );
          return response.data;
        } catch (error) {
          throw formatSentryError('createIssueAlertRule', error);
        }
      },
    },

    updateIssueAlertRule: {
      isTool: true,
      description:
        'Update an existing Sentry issue alert rule (name, conditions, actions, or frequency) so an audit workflow can adjust thresholds on provisioned monitor coverage.',
      input: SentryUpdateIssueAlertRuleInputSchema,
      handler: async (ctx, input: SentryUpdateIssueAlertRuleInput) => {
        const orgSlug = getOrgSlug(ctx);
        const ruleUrl = `${buildBaseUrl(ctx)}/projects/${orgSlug}/${encodeURIComponent(
          input.project
        )}/rules/${encodeURIComponent(input.ruleId)}/`;

        try {
          // Sentry's rule-update endpoint replaces the whole rule rather than
          // patching it, so every persisted field — not just the ones this
          // action lets callers set — must be backfilled from the current
          // rule before the PUT, or an unrelated field like `name` would
          // silently wipe filters/environment/owner on the existing rule.
          const current = await ctx.client.get<{
            name: string;
            actionMatch: string;
            conditions: unknown[];
            actions: unknown[];
            frequency?: number;
            filters?: unknown[];
            filterMatch?: string;
            environment?: string | null;
            owner?: string | null;
          }>(ruleUrl);

          const body = {
            name: input.name ?? current.data.name,
            actionMatch: input.actionMatch ?? current.data.actionMatch,
            conditions: input.conditions ?? current.data.conditions,
            actions: input.actions ?? current.data.actions,
            frequency: input.frequency ?? current.data.frequency,
            filters: current.data.filters,
            filterMatch: current.data.filterMatch,
            environment: current.data.environment,
            owner: current.data.owner,
          };

          const response = await ctx.client.put(ruleUrl, body);
          return response.data;
        } catch (error) {
          throw formatSentryError('updateIssueAlertRule', error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.sentry.test.description', {
      defaultMessage: 'Verifies the Sentry connection by listing organization projects',
    }),
    handler: async (ctx) => {
      const orgSlug = getOrgSlug(ctx);
      try {
        const response = await ctx.client.get<SentryProject[]>(
          `${buildBaseUrl(ctx)}/organizations/${orgSlug}/projects/`
        );
        return {
          message: `Successfully connected to Sentry organization "${orgSlug}" (${response.data.length} project(s) visible).`,
        };
      } catch (error) {
        throw formatSentryError('test', error);
      }
    },
  },

  skill: [
    'Use listIssues (default query "is:unresolved") as the primary read path to build a triage feed; scope to a project when known, otherwise it searches the whole organization.',
    'Call getIssue with an issue ID from listIssues to get full detail (status, culprit, counts, assignee) before deciding on an action.',
    "To inspect recurrence or a specific stack trace, call listIssueEvents for the event list, then getEvent (with the project slug and event ID) for one event's full stack trace, tags, and context.",
    'Use resolveIssue, ignoreIssue, unresolveIssue, and assignIssue for single-issue lifecycle changes; use bulkUpdateIssues when applying the same status or assignee change to many issue IDs in one project at once.',
    'deleteIssue is irreversible — only use it for a confirmed-noise or duplicate issue, not as an alternative to ignoreIssue.',
    'Use listProjects to resolve a project slug before calling any project-scoped action (getEvent, bulkUpdateIssues, listIssueAlertRules, createIssueAlertRule, updateIssueAlertRule).',
    'listIssueAlertRules, createIssueAlertRule, and updateIssueAlertRule manage monitor coverage, not individual issues — conditions and actions use Sentry\'s rule id catalog (e.g. "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition").',
  ].join('\n'),
};
