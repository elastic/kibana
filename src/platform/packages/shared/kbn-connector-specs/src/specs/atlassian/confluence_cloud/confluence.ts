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

const CONFLUENCE_V2_PREFIX = '/wiki/api/v2';

export const ConfluenceCloudConnector: ConnectorSpec = {
  metadata: {
    id: '.confluence-cloud',
    displayName: 'Confluence Cloud',
    description: i18n.translate('core.kibanaConnectorSpecs.confluence.metadata.description', {
      defaultMessage: 'Connect to Confluence Cloud to search and retrieve pages and spaces.',
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
              label: i18n.translate('core.kibanaConnectorSpecs.confluence.auth.password.label', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.confluence.auth.password.helpText',
                {
                  defaultMessage: 'Your Atlassian API token',
                }
              ),
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
        i18n.translate('core.kibanaConnectorSpecs.confluence.config.subdomain.description', {
          defaultMessage: 'Your Atlassian subdomain',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.confluence.config.subdomain.label', {
          defaultMessage: 'Subdomain',
        }),
        placeholder: 'your-domain',
        helpText: i18n.translate('core.kibanaConnectorSpecs.confluence.config.subdomain.helpText', {
          defaultMessage:
            'The subdomain for your Confluence Cloud site (e.g. your-domain for https://your-domain.atlassian.net)',
        }),
      }),
  }),
  actions: {
    listPages: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        cursor: z.string().optional(),
        spaceId: z.union(z.string(), z.array(z.string())).optional(),
        title: z.string().optional(),
        status: z.union(z.string(), z.array(z.string())).optional(),
        bodyFormat: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          limit?: number;
          cursor?: string;
          spaceId?: string | string[];
          title?: string;
          status?: string | string[];
          bodyFormat?: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {};
        if (typedInput.limit != null) params.limit = typedInput.limit;
        if (typedInput.cursor != null) params.cursor = typedInput.cursor;
        if (typedInput.spaceId != null) {
          params['space-id'] = Array.isArray(typedInput.spaceId)
            ? typedInput.spaceId
            : [typedInput.spaceId];
        }
        if (typedInput.title != null) params.title = typedInput.title;
        if (typedInput.status != null) {
          params.status = Array.isArray(typedInput.status)
            ? typedInput.status
            : [typedInput.status];
        }
        if (typedInput.bodyFormat != null) params['body-format'] = typedInput.bodyFormat;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/pages`,
          Object.keys(params).length > 0 ? { params } : undefined
        );
        return response.data;
      },
    },
    getPage: {
      isTool: false,
      input: z.object({
        id: z.string(),
        bodyFormat: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { id: string; bodyFormat?: string };
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {};
        if (typedInput.bodyFormat != null) params['body-format'] = typedInput.bodyFormat;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/pages/${typedInput.id}`,
          { params: Object.keys(params).length > 0 ? params : undefined }
        );
        return response.data;
      },
    },
    listSpaces: {
      isTool: false,
      input: z.object({
        limit: z.number().optional(),
        cursor: z.string().optional(),
        ids: z.union(z.string(), z.array(z.string())).optional(),
        keys: z.union(z.string(), z.array(z.string())).optional(),
        type: z.string().optional(),
        status: z.string().optional(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as {
          limit?: number;
          cursor?: string;
          ids?: string | string[];
          keys?: string | string[];
          type?: string;
          status?: string;
        };
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {};
        if (typedInput.limit != null) params.limit = typedInput.limit;
        if (typedInput.cursor != null) params.cursor = typedInput.cursor;
        if (typedInput.ids != null) {
          params.ids = Array.isArray(typedInput.ids) ? typedInput.ids : [typedInput.ids];
        }
        if (typedInput.keys != null) {
          params.keys = Array.isArray(typedInput.keys) ? typedInput.keys : [typedInput.keys];
        }
        if (typedInput.type != null) params.type = typedInput.type;
        if (typedInput.status != null) params.status = typedInput.status;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/spaces`,
          Object.keys(params).length > 0 ? { params } : undefined
        );
        return response.data;
      },
    },
    getSpace: {
      isTool: false,
      input: z.object({
        id: z.string(),
      }),
      handler: async (ctx, input) => {
        const typedInput = input as { id: string };
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/spaces/${typedInput.id}`
        );
        return response.data;
      },
    },
  },
};
