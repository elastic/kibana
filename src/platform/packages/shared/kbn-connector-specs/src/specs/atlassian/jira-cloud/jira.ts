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
      defaultMessage: 'Connect to Jira to pull data from your project.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
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
      isTool: false,
      input: z.object({
        jql: z.string(),
        maxResults: z.number().optional(),
        nextPageToken: z.string().optional(),
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
      isTool: false,
      input: z.object({
        issueId: z.string(),
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
      isTool: false,
      input: z.object({
        maxResults: z.number().optional(),
        startAt: z.number().optional(),
        query: z.string().optional(),
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
      isTool: false,
      input: z.object({
        projectId: z.string(),
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
      isTool: false,
      input: z.object({
        query: z.string().optional(),
        username: z.string().optional(),
        accountId: z.string().optional(),
        startAt: z.number().optional(),
        maxResults: z.number().optional(),
        property: z.string().optional(),
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
};
