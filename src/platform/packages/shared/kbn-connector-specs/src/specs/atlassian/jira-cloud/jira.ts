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
import { UISchemas, type ConnectorSpec } from '../../../connector_spec';
import { withMcpClient, callToolJson } from '../../../lib/mcp';
import type {
  GetIssueInput,
  GetProjectInput,
  GetProjectsInput,
  SearchIssuesWithJqlInput,
  SearchUsersInput,
} from './types';
import {
  GetIssueInputSchema,
  GetProjectInputSchema,
  GetProjectsInputSchema,
  SearchIssuesWithJqlInputSchema,
  SearchUsersInputSchema,
} from './types';

const JIRA_CLOUD_MCP_SERVER_URL = 'https://mcp.atlassian.com/v1/sse';

export const JiraConnector: ConnectorSpec = {
  metadata: {
    id: '.jira-cloud',
    displayName: 'Jira Cloud',
    description: i18n.translate('core.kibanaConnectorSpecs.jira.metadata.description', {
      defaultMessage: 'Search issues, browse projects, and look up users in Jira Cloud',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },
  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
          scope: 'read:jira-work read:jira-user offline_access',
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(JIRA_CLOUD_MCP_SERVER_URL)
        .describe('Jira Cloud MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: JIRA_CLOUD_MCP_SERVER_URL,
          hidden: true,
          label: i18n.translate('core.kibanaConnectorSpecs.jira.config.serverUrl.label', {
            defaultMessage: 'MCP server URL',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.jira.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the official Atlassian remote MCP server.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    searchIssuesWithJql: {
      isTool: true,
      description:
        'Search or filter Jira issues using JQL (Jira Query Language). Use when you need to find issues by status, assignee, project, label, or any other criteria. Supports pagination via nextPageToken.',
      input: SearchIssuesWithJqlInputSchema,
      handler: async (ctx, input: SearchIssuesWithJqlInput) => {
        return callToolJson(ctx, 'search_issues_using_jql', {
          jql: input.jql,
          max_results: input.maxResults,
          next_page_token: input.nextPageToken,
        });
      },
    },
    getIssue: {
      isTool: true,
      description:
        'Fetch full details of a single Jira issue by its ID or key. Use when you already have the issue key (e.g. PROJ-123) or issue ID and need the complete record including fields, comments, and metadata.',
      input: GetIssueInputSchema,
      handler: async (ctx, input: GetIssueInput) => {
        return callToolJson(ctx, 'get_issue', { issue_key: input.issueId });
      },
    },
    getProjects: {
      isTool: true,
      description:
        'List or search Jira projects. Use when you need to discover available projects or find a project by name or key. Supports pagination and optional text filtering.',
      input: GetProjectsInputSchema,
      handler: async (ctx, input: GetProjectsInput) => {
        return callToolJson(ctx, 'list_projects', {
          query: input.query,
          max_results: input.maxResults,
          start_at: input.startAt,
        });
      },
    },
    getProject: {
      isTool: true,
      description:
        'Fetch full details of a single Jira project by its ID or key. Use when you already have the project key (e.g. PROJ) or numeric project ID and need the complete project record.',
      input: GetProjectInputSchema,
      handler: async (ctx, input: GetProjectInput) => {
        return callToolJson(ctx, 'get_project', { project_key: input.projectId });
      },
    },
    searchUsers: {
      isTool: true,
      description:
        'Find Jira users by name, username, or email. Use when you need a user accountId (e.g. for JQL assignee filters) or to look up user contact details. At least one search parameter should be provided.',
      input: SearchUsersInputSchema,
      handler: async (ctx, input: SearchUsersInput) => {
        return callToolJson(ctx, 'search_users', {
          query: input.query,
          account_id: input.accountId,
          username: input.username,
          max_results: input.maxResults,
          start_at: input.startAt,
        });
      },
    },
  },
  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.jira.test.description', {
      defaultMessage:
        'Verifies connection to the Atlassian Jira Cloud MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to Jira Cloud MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    'Typical patterns:',
    '- Discovery: getProjects → getProject (by key) → searchIssuesWithJql (scoped to project)',
    '- Issue lookup: searchIssuesWithJql → getIssue (by key from results)',
    '- User-filtered search: searchUsers (to get accountId) → searchIssuesWithJql with assignee = "accountId"',
    '- For capabilities not yet exposed as named actions: listTools to discover, callTool to invoke.',
  ].join('\n'),
};
