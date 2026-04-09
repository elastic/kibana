/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../../..';
const buildBaseUrl = (ctx: ActionContext) =>
  `https://${(ctx.config?.subdomain as string).trim()}.atlassian.net`;

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
        type: 'basic',
        defaults: {},
        overrides: {
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
  schema: z.object({
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
            'The subdomain for your Jira Cloud site (e.g. your-domain for https://your-domain.atlassian.com)',
        }),
      }),
  }),
  actions: {
    searchIssuesWithJql: {
      isTool: true,
      description:
        'Search or filter Jira issues using JQL (Jira Query Language). Use when you need to find issues by status, assignee, project, label, or any other criteria. Supports pagination via nextPageToken.',
      input: z.object({
        jql: z
          .string()
          .describe(
            'JQL query string to filter issues. ' +
              'Operators: = != ~ (contains) IN NOT IN > >= < <=. Combine with AND/OR. ' +
              'Date functions: startOfDay(), endOfDay(), startOfWeek(), endOfWeek(), startOfMonth(). ' +
              'Use ORDER BY to sort, e.g. ORDER BY updated DESC. ' +
              'Examples: "project = PROJ AND status = \\"In Progress\\"", ' +
              '"assignee = currentUser() AND priority = High", ' +
              '"created >= -7d ORDER BY created DESC", ' +
              '"project = PROJ AND labels = \\"bug\\" AND status != Done". ' +
              'To filter by user, get accountId from searchUsers and use: assignee = "accountId".'
          ),
        maxResults: z
          .number()
          .optional()
          .describe('Maximum number of issues to return per page (default determined by Jira API)'),
        nextPageToken: z
          .string()
          .optional()
          .describe('Pagination token from a previous response to fetch the next page of results'),
      }),
      handler: async (ctx, input) => {
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
      description:
        'Fetch full details of a single Jira issue by its ID or key. Use when you already have the issue key (e.g. PROJ-123) or issue ID and need the complete record including fields, comments, and metadata.',
      input: z.object({
        issueId: z
          .string()
          .describe('Issue key (e.g., PROJ-123) or numeric issue ID (e.g., 10042)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          issueId: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/rest/api/3/issue/${typedInput.issueId}`);
        return response.data;
      },
    },
    getProjects: {
      isTool: true,
      description:
        'List or search Jira projects. Use when you need to discover available projects or find a project by name or key. Supports pagination and optional text filtering.',
      input: z.object({
        maxResults: z
          .number()
          .optional()
          .describe('Maximum number of projects to return (default determined by Jira API)'),
        startAt: z
          .number()
          .optional()
          .describe(
            'Zero-based index of the first project to return, for pagination (e.g., 0, 20, 40)'
          ),
        query: z
          .string()
          .optional()
          .describe(
            'Text to filter projects by name or key (e.g., "Marketing" or "MKTG"). Leave empty to list all projects.'
          ),
      }),
      handler: async (ctx, input) => {
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
      description:
        'Fetch full details of a single Jira project by its ID or key. Use when you already have the project key (e.g. PROJ) or numeric project ID and need the complete project record.',
      input: z.object({
        projectId: z
          .string()
          .describe('Project key (e.g., PROJ) or numeric project ID (e.g., 10000)'),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          projectId: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}/rest/api/3/project/${typedInput.projectId}`
        );
        return response.data;
      },
    },
    searchUsers: {
      isTool: true,
      description:
        'Find Jira users by name, username, or email. Use when you need a user accountId (e.g. for JQL assignee filters) or to look up user contact details. At least one search parameter should be provided.',
      input: z.object({
        query: z
          .string()
          .optional()
          .describe(
            'Free-text search string matched against display name, username, or email (e.g., "john.doe" or "John")'
          ),
        username: z
          .string()
          .optional()
          .describe("User's username or email address for exact lookup"),
        accountId: z
          .string()
          .optional()
          .describe(
            "User's Atlassian account ID for exact lookup (e.g., 5b10ac8d82e05b22cc7d4ef5)"
          ),
        startAt: z
          .number()
          .optional()
          .describe(
            'Zero-based index of the first user to return, for pagination (e.g., 0, 10, 20)'
          ),
        maxResults: z
          .number()
          .optional()
          .describe('Maximum number of users to return (default determined by Jira API)'),
        property: z
          .string()
          .optional()
          .describe(
            'A query string used to search user properties. Property keys and values must not exceed 100 characters.'
          ),
      }),
      handler: async (ctx, input) => {
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
  },
  skill: [
    'Typical patterns:',
    '- Discovery: getProjects → getProject (by key) → searchIssuesWithJql (scoped to project)',
    '- Issue lookup: searchIssuesWithJql → getIssue (by key from results)',
    '- User-filtered search: searchUsers (to get accountId) → searchIssuesWithJql with assignee = "accountId"',
  ].join('\n'),
};
