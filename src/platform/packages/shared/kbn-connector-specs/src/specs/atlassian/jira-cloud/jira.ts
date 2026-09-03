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
import type {
  AddAttachmentInput,
  AddCommentInput,
  AddWatcherInput,
  AssignIssueInput,
  CreateIssueInput,
  DeleteIssueInput,
  GetAttachmentInput,
  GetCreateMetadataInput,
  GetIssueInput,
  GetIssueTypesInput,
  GetProjectInput,
  GetProjectsInput,
  GetTransitionsInput,
  LinkIssuesInput,
  RemoveWatcherInput,
  SearchIssuesWithJqlInput,
  SearchUsersInput,
  TransitionIssueInput,
  UpdateIssueInput,
} from './types';
import {
  AddAttachmentInputSchema,
  AddCommentInputSchema,
  AddWatcherInputSchema,
  AssignIssueInputSchema,
  CreateIssueInputSchema,
  DeleteIssueInputSchema,
  GetAttachmentInputSchema,
  GetCreateMetadataInputSchema,
  GetIssueInputSchema,
  GetIssueTypesInputSchema,
  GetProjectInputSchema,
  GetProjectsInputSchema,
  GetTransitionsInputSchema,
  LinkIssuesInputSchema,
  RemoveWatcherInputSchema,
  SearchUsersInputSchema,
  SearchIssuesWithJqlInputSchema,
  TransitionIssueInputSchema,
  UpdateIssueInputSchema,
} from './types';
import { toAdf } from './adf';
import type { ActionContext, ConnectorSpec } from '../../../..';

const buildBaseUrl = (ctx: ActionContext): string => {
  if (ctx.secrets?.authType === 'oauth_authorization_code') {
    const cloudId = String(ctx.config?.cloudId ?? '').trim();
    if (cloudId === '') {
      throw new Error(
        'Jira Cloud ID is required in connector configuration when using OAuth authentication.'
      );
    }
    return `https://api.atlassian.com/ex/jira/${cloudId}`;
  }
  const subdomain = String(ctx.config?.subdomain ?? '').trim();
  if (subdomain === '') {
    throw new Error('Jira Cloud subdomain is required');
  }
  return `https://${subdomain}.atlassian.net`;
};

const issueTypeField = (issueType: string) =>
  /^\d+$/.test(issueType) ? { id: issueType } : { name: issueType };

export const JiraConnector: ConnectorSpec = {
  metadata: {
    id: '.jira-cloud',
    displayName: 'Jira Cloud',
    description: i18n.translate('core.kibanaConnectorSpecs.jira.metadata.description', {
      defaultMessage: 'Search, create, and manage issues, projects, and users in Jira Cloud',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },
  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
          scope: 'read:jira-work read:jira-user write:jira-work offline_access',
        },
      },
      {
        type: 'basic',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.jira.auth.basic.label', {
            defaultMessage: 'Shared API key',
          }),
          meta: {
            password: {
              label: i18n.translate('core.kibanaConnectorSpecs.jira.auth.password.label', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.jira.auth.password.helpText', {
                defaultMessage: 'Your Jira API token',
              }),
            },
          },
        },
      },
    ],
  },
  schema: lazySchema(() =>
    z.object({
      subdomain: z
        .string()
        .min(1)
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.description', {
            defaultMessage: 'Your Atlassian subdomain',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.label', {
            defaultMessage: 'Subdomain',
          }),
          placeholder: 'your-domain',
          helpText: i18n.translate('core.kibanaConnectorSpecs.jira.config.subdomain.helpText', {
            defaultMessage:
              'The subdomain for your Jira Cloud site (e.g. your-domain for https://your-domain.atlassian.net)',
          }),
        }),
      cloudId: z
        .string()
        .optional()
        .describe(
          i18n.translate('core.kibanaConnectorSpecs.jira.config.cloudId.description', {
            defaultMessage: 'Atlassian cloud ID (OAuth)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.jira.config.cloudId.label', {
            defaultMessage: 'Cloud ID',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.jira.config.cloudId.helpText', {
            defaultMessage:
              'Required for OAuth. To find your Cloud ID, visit https://your-subdomain.atlassian.net/_edge/tenant_info (replace your-subdomain with your Atlassian subdomain) and use the cloudId value from the response. Your Atlassian OAuth app must have the write:jira-work scope enabled to use write actions.',
          }),
        }),
    })
  ),
  actions: {
    searchIssuesWithJql: {
      isTool: true,
      scope: 'read',
      description:
        'Search or filter Jira issues using JQL (Jira Query Language). Use when you need to find issues by status, assignee, project, label, or any other criteria. Supports pagination via nextPageToken.',
      input: SearchIssuesWithJqlInputSchema,
      handler: async (ctx, input: SearchIssuesWithJqlInput) => {
        const typedInput = input as {
          jql: string;
          maxResults?: number;
          nextPageToken?: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(`${baseUrl}/rest/api/3/search/jql`, typedInput);
        return response.data;
      },
    },
    getIssue: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch full details of a single Jira issue by its ID or key. Use when you already have the issue key (e.g. PROJ-123) or issue ID and need the complete record including fields, comments, and metadata.',
      input: GetIssueInputSchema,
      handler: async (ctx, input: GetIssueInput) => {
        const typedInput = input as {
          issueId: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(typedInput.issueId)}`
        );
        return response.data;
      },
    },
    getProjects: {
      isTool: true,
      scope: 'read',
      description:
        'List or search Jira projects. Use when you need to discover available projects or find a project by name or key. Supports pagination and optional text filtering.',
      input: GetProjectsInputSchema,
      handler: async (ctx, input: GetProjectsInput) => {
        const typedInput = input as {
          maxResults?: number;
          startAt?: number;
          query?: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/rest/api/3/project/search`, {
          params: typedInput,
        });
        return response.data;
      },
    },
    getProject: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch full details of a single Jira project by its ID or key. Use when you already have the project key (e.g. PROJ) or numeric project ID and need the complete project record.',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) => {
        const typedInput = input as {
          projectId: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/project/${encodeURIComponent(typedInput.projectId)}`
        );
        return response.data;
      },
    },
    searchUsers: {
      isTool: true,
      scope: 'read',
      description:
        'Find Jira users by name, username, or email. Use when you need a user accountId (e.g. for JQL assignee filters) or to look up user contact details. At least one search parameter should be provided.',
      input: SearchUsersInputSchema,
      handler: async (ctx, input: SearchUsersInput) => {
        const typedInput = input as {
          query?: string;
          username?: string;
          accountId?: string;
          startAt?: number;
          maxResults?: number;
          property?: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/rest/api/3/user/search`, {
          params: typedInput,
        });
        return response.data;
      },
    },

    // =========================================================================
    // Must-have write actions
    // =========================================================================

    createIssue: {
      isTool: true,
      scope: 'write',
      description:
        'Create a new Jira issue. Use when you need to file a bug, task, story, or other issue type. ' +
        'Call getIssueTypes first to discover valid issue types for the project, and ' +
        'getCreateMetadata to discover required fields.',
      input: CreateIssueInputSchema,
      handler: async (ctx, input: CreateIssueInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const fields: Record<string, unknown> = {
          project: { key: input.projectKey },
          summary: input.summary,
          issuetype: issueTypeField(input.issueType),
        };
        if (input.description !== undefined) {
          fields.description = toAdf(input.description);
        }
        if (input.priority !== undefined) {
          fields.priority = { name: input.priority };
        }
        if (input.labels !== undefined) {
          fields.labels = input.labels;
        }
        if (input.assigneeAccountId !== undefined) {
          fields.assignee = { accountId: input.assigneeAccountId };
        }
        if (input.parent !== undefined) {
          fields.parent = { key: input.parent };
        }
        const response = await ctx.client.post(`${baseUrl}/rest/api/3/issue`, { fields });
        return response.data;
      },
    },

    updateIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Update fields on an existing Jira issue. Use when you need to change the summary, description, ' +
        'priority, labels, assignee, or issue type. Only the fields you provide are updated; ' +
        'omitted fields are left unchanged.',
      input: UpdateIssueInputSchema,
      handler: async (ctx, input: UpdateIssueInput) => {
        const { issueId, ...rest } = input;
        const baseUrl = buildBaseUrl(ctx);
        const fields: Record<string, unknown> = {};
        if (rest.summary !== undefined) {
          fields.summary = rest.summary;
        }
        if (rest.description !== undefined) {
          fields.description = toAdf(rest.description);
        }
        if (rest.issueType !== undefined) {
          fields.issuetype = issueTypeField(rest.issueType);
        }
        if (rest.priority !== undefined) {
          fields.priority = { name: rest.priority };
        }
        if (rest.labels !== undefined) {
          fields.labels = rest.labels;
        }
        if (rest.assigneeAccountId !== undefined) {
          fields.assignee =
            rest.assigneeAccountId === null ? null : { accountId: rest.assigneeAccountId };
        }
        if (rest.parent !== undefined) {
          fields.parent = { key: rest.parent };
        }
        await ctx.client.put(`${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueId)}`, {
          fields,
        });
        return { updated: true, issueId };
      },
    },

    addComment: {
      isTool: true,
      scope: 'write',
      description:
        'Add a comment to an existing Jira issue. Use when you need to post an update, note, or ' +
        'remediation detail on a ticket without changing its fields.',
      input: AddCommentInputSchema,
      handler: async (ctx, input: AddCommentInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.post(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/comment`,
          { body: toAdf(input.body) }
        );
        return response.data;
      },
    },

    transitionIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Move a Jira issue to a new status by executing a workflow transition. ' +
        'Call getTransitions first — Jira requires a transition ID, not a status name.',
      input: TransitionIssueInputSchema,
      handler: async (ctx, input: TransitionIssueInput) => {
        const baseUrl = buildBaseUrl(ctx);
        await ctx.client.post(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/transitions`,
          { transition: { id: input.transitionId } }
        );
        return { transitioned: true, issueId: input.issueId, transitionId: input.transitionId };
      },
    },

    // =========================================================================
    // Should-have actions
    // =========================================================================

    getTransitions: {
      isTool: true,
      scope: 'read',
      description:
        'List the workflow transitions available for a Jira issue. ' +
        'Use before transitionIssue — Jira requires a transition ID, not a status name. ' +
        'Returns transition IDs, names, and target status details.',
      input: GetTransitionsInputSchema,
      handler: async (ctx, input: GetTransitionsInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/transitions`
        );
        return response.data;
      },
    },

    getIssueTypes: {
      isTool: true,
      scope: 'read',
      description:
        'List the issue types available in a Jira project (e.g. Bug, Task, Story, Epic). ' +
        'Use before createIssue to discover valid issue type names and IDs for the project.',
      input: GetIssueTypesInputSchema,
      handler: async (ctx, input: GetIssueTypesInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/issue/createmeta/${encodeURIComponent(
            input.projectKey
          )}/issuetypes`
        );
        return response.data;
      },
    },

    getCreateMetadata: {
      isTool: true,
      scope: 'read',
      description:
        'Get the required and optional fields for creating a Jira issue of a specific type. ' +
        'Use after getIssueTypes to build a valid createIssue payload, especially when the ' +
        'project has required custom fields.',
      input: GetCreateMetadataInputSchema,
      handler: async (ctx, input: GetCreateMetadataInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/issue/createmeta/${encodeURIComponent(
            input.projectKey
          )}/issuetypes/${encodeURIComponent(input.issueTypeId)}`
        );
        return response.data;
      },
    },

    assignIssue: {
      isTool: true,
      scope: 'destroy',
      description:
        'Assign a Jira issue to a user, set it to the default assignee, or unassign it. ' +
        'Use searchUsers to resolve a name or email to an accountId before calling this.',
      input: AssignIssueInputSchema,
      handler: async (ctx, input: AssignIssueInput) => {
        const baseUrl = buildBaseUrl(ctx);
        await ctx.client.put(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/assignee`,
          { accountId: input.accountId }
        );
        return { assigned: true, issueId: input.issueId, accountId: input.accountId };
      },
    },

    addAttachment: {
      isTool: true,
      scope: 'write',
      description:
        'Attach a file to a Jira issue. The file must be provided as a base64-encoded string. ' +
        'WARNING: Only call this when you already have the base64-encoded content ready — do not call just to store arbitrary data. ' +
        'Use when you need to upload a screenshot, log, or report to a ticket.',
      input: AddAttachmentInputSchema,
      handler: async (ctx, input: AddAttachmentInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const buffer = Buffer.from(input.file, 'base64');
        const formData = new FormData();
        formData.append('file', new Blob([buffer]), input.filename);
        const response = await ctx.client.post(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/attachments`,
          formData,
          { headers: { 'X-Atlassian-Token': 'no-check' } }
        );
        return response.data;
      },
    },

    // =========================================================================
    // Nice-to-have actions
    // =========================================================================

    getAttachment: {
      isTool: true,
      scope: 'read',
      description:
        'Download the content of a Jira attachment by its ID. ' +
        'Returns the file as a base64-encoded string along with its MIME type. ' +
        'Attachment IDs are found in the attachments array of a getIssue response. ' +
        'WARNING: Only call this when you have a concrete plan to process the binary data (e.g. pass it to an Elasticsearch ingest pipeline attachment processor). Do not call just to inspect file contents.',
      input: GetAttachmentInputSchema,
      handler: async (ctx, input: GetAttachmentInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/attachment/content/${encodeURIComponent(input.attachmentId)}`,
          { responseType: 'arraybuffer' }
        );
        return {
          content: Buffer.from(response.data as ArrayBuffer).toString('base64'),
          contentType: response.headers['content-type'] ?? 'application/octet-stream',
          attachmentId: input.attachmentId,
        };
      },
    },

    linkIssues: {
      isTool: true,
      scope: 'write',
      description:
        'Create a link between two Jira issues (e.g. "Relates", "Blocks", "Duplicate"). ' +
        'Use when you need to establish a relationship between tickets.',
      input: LinkIssuesInputSchema,
      handler: async (ctx, input: LinkIssuesInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const body: Record<string, unknown> = {
          type: { name: input.linkType },
          inwardIssue: { key: input.inwardIssueKey },
          outwardIssue: { key: input.outwardIssueKey },
        };
        if (input.comment !== undefined) {
          body.comment = { body: toAdf(input.comment) };
        }
        await ctx.client.post(`${baseUrl}/rest/api/3/issueLink`, body);
        return {
          linked: true,
          inwardIssueKey: input.inwardIssueKey,
          outwardIssueKey: input.outwardIssueKey,
          linkType: input.linkType,
        };
      },
    },

    deleteIssue: {
      isTool: false,
      scope: 'destroy',
      description:
        'Permanently delete a Jira issue. This is irreversible. ' +
        'Set deleteSubtasks to true if the issue has subtasks, otherwise Jira returns a 400.',
      input: DeleteIssueInputSchema,
      handler: async (ctx, input: DeleteIssueInput) => {
        const baseUrl = buildBaseUrl(ctx);
        await ctx.client.delete(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}`,
          {
            params:
              input.deleteSubtasks !== undefined ? { deleteSubtasks: input.deleteSubtasks } : {},
          }
        );
        return { deleted: true, issueId: input.issueId };
      },
    },

    addWatcher: {
      isTool: true,
      scope: 'write',
      description:
        'Add a user as a watcher on a Jira issue so they receive notifications. ' +
        'Use searchUsers to resolve a name or email to an accountId before calling this.',
      input: AddWatcherInputSchema,
      handler: async (ctx, input: AddWatcherInput) => {
        const baseUrl = buildBaseUrl(ctx);
        // Jira REST v3 expects the body to be a bare JSON string (the accountId), not an object.
        await ctx.client.post(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/watchers`,
          JSON.stringify(input.accountId),
          { headers: { 'Content-Type': 'application/json' } }
        );
        return { watching: true, issueId: input.issueId, accountId: input.accountId };
      },
    },

    removeWatcher: {
      isTool: true,
      scope: 'destroy',
      description:
        'Remove a user from the watcher list of a Jira issue. ' +
        'Use searchUsers to resolve a name or email to an accountId before calling this.',
      input: RemoveWatcherInputSchema,
      handler: async (ctx, input: RemoveWatcherInput) => {
        const baseUrl = buildBaseUrl(ctx);
        await ctx.client.delete(
          `${baseUrl}/rest/api/3/issue/${encodeURIComponent(input.issueId)}/watchers`,
          { params: { accountId: input.accountId } }
        );
        return { unwatched: true, issueId: input.issueId, accountId: input.accountId };
      },
    },
  },
  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.jira.test.description', {
      defaultMessage: 'Verifies Jira Cloud connection by fetching the current user',
    }),
    handler: async (ctx) => {
      const baseUrl = buildBaseUrl(ctx);
      await ctx.client.get(`${baseUrl}/rest/api/3/myself`);
      return {};
    },
    enabled: true,
  },

  skill: [
    'Typical patterns:',
    '- Discovery: getProjects → getProject (by key) → searchIssuesWithJql (scoped to project)',
    '- Issue lookup: searchIssuesWithJql → getIssue (by key from results)',
    '- User-filtered search: searchUsers (to get accountId) → searchIssuesWithJql with assignee = "accountId"',
    '- Create issue: getIssueTypes (to pick a valid type) → getCreateMetadata (to check required fields) → createIssue',
    '- Transition: getTransitions (to get the transition ID — Jira rejects status names) → transitionIssue',
    '- Assign: searchUsers (to get accountId — Jira rejects usernames) → assignIssue',
    '- Remediation chain: createIssue → addComment → transitionIssue (close when resolved)',
    '- File evidence: addAttachment (base64-encoded file) → addComment referencing the attachment',
  ].join('\n'),
};
