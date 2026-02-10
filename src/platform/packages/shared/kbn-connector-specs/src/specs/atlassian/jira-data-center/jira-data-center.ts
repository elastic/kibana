/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../../connector_spec';
import { i18n } from '@kbn/i18n';

const buildBaseUrl = (ctx: ActionContext) =>
  (ctx.config?.url as string)?.trim().replace(/\/$/, '') ?? '';

export const JiraDataCenter: ConnectorSpec = {
  metadata: {
    id: '.jira-data-center',
    displayName: 'Jira data center',
    description: i18n.translate('core.kibanaConnectorSpecs.jira.metadata.description', {
      defaultMessage: 'Connect to Jira Data Center to pull data from your project.',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  auth: {
    types: [
      {
        type: 'bearer',
        defaults: {},
        overrides: {
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.jiraDataCenter.auth.token.label',
                { defaultMessage: 'Personal Access Token' }
              ),
            },
          },
        },
      },
    ],
  },
  schema: z.object({
    url: z
      .string()
      .url()
      .describe(
        i18n.translate('core.kibanaConnectorSpecs.jiraDataCenter.config.url.description', {
          defaultMessage: 'Jira Data Center instance URL',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.jiraDataCenter.config.url.label', {
          defaultMessage: 'Instance URL',
        }),
        placeholder: 'https://jira.example.com',
        helpText: i18n.translate('core.kibanaConnectorSpecs.jiraDataCenter.config.url.helpText', {
          defaultMessage: 'The base URL of your Jira Data Center instance',
        }),
      }),
  }),
  actions: {
    getProjects: {
      isTool: false,
      input: z.object({
        maxResults: z.number().optional(),
        query: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { maxResults?: number; query: string };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/rest/api/2/project`, {
          params: {
            ...(typedInput.maxResults != null && { maxResults: typedInput.maxResults }),
            query: typedInput.query,
          },
        });
        return response.data;
      },
    },
  },
  test: {
    handler: async () => ({ ok: true }),
  },
};
