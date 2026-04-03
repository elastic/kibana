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
import {
  ListPagesInputSchema,
  GetPageInputSchema,
  ListSpacesInputSchema,
  GetSpaceInputSchema,
} from './types';
import type { ListPagesInput, GetPageInput, ListSpacesInput, GetSpaceInput } from './types';
import getResourceWorkflow from './workflows/get_resource.yaml';
import listResourceWorkflow from './workflows/list_resource.yaml';

/** Bare subdomain: alphanumeric and hyphens only (no dots, no .atlassian.net suffix). */
const BARE_SUBDOMAIN_REGEX = /^[a-z0-9-]+$/i;
const ATLASSIAN_NET_SUFFIX = '.atlassian.net';

/**
 * Builds the Confluence Cloud base URL from the connector config.
 * Validates and normalizes subdomain: trims, strips optional .atlassian.net suffix,
 * rejects empty, full hostnames (containing '.'), and invalid characters.
 */
const buildBaseUrl = (ctx: ActionContext): string => {
  let sub = String(ctx.config?.subdomain ?? '').trim();
  if (sub === '') {
    throw new Error('Confluence Cloud subdomain is required');
  }
  if (sub.toLowerCase().endsWith(ATLASSIAN_NET_SUFFIX)) {
    sub = sub.slice(0, -ATLASSIAN_NET_SUFFIX.length).trim();
  }
  if (sub.includes('.')) {
    throw new Error(
      'Confluence Cloud subdomain must be a bare subdomain (for example, your-domain), not a full hostname'
    );
  }
  if (!BARE_SUBDOMAIN_REGEX.test(sub)) {
    throw new Error('Confluence Cloud subdomain may only contain letters, numbers, and hyphens');
  }
  return `https://${sub}${ATLASSIAN_NET_SUFFIX}`;
};

const CONFLUENCE_V2_PREFIX = '/wiki/api/v2';

/** Default page size when listing spaces or pages and no limit is provided. */
const DEFAULT_LIST_LIMIT = 25;

export const ConfluenceCloudConnector: ConnectorSpec = {
  metadata: {
    id: '.confluence-cloud',
    displayName: 'Confluence Cloud',
    description: i18n.translate('core.kibanaConnectorSpecs.confluence.metadata.description', {
      defaultMessage: 'Connect to Confluence Cloud to search and retrieve pages and spaces.',
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
            username: {
              label: i18n.translate('core.kibanaConnectorSpecs.confluence.auth.username.label', {
                defaultMessage: 'Account email',
              }),
            },
            password: {
              label: i18n.translate('core.kibanaConnectorSpecs.confluence.auth.password.label', {
                defaultMessage: 'API token',
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
      .trim()
      .min(1)
      .regex(BARE_SUBDOMAIN_REGEX, {
        message:
          'Subdomain may only contain letters, numbers, and hyphens (for example, your-domain)',
      })
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
            'The subdomain for your Confluence Cloud site (for example, your-domain for https://your-domain.atlassian.net)',
        }),
      }),
  }),
  actions: {
    listPages: {
      isTool: false,
      input: ListPagesInputSchema,
      handler: async (ctx, input: ListPagesInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {
          limit: input.limit ?? DEFAULT_LIST_LIMIT,
        };
        if (input.cursor != null) params.cursor = input.cursor;
        if (input.spaceId != null) {
          params['space-id'] = Array.isArray(input.spaceId) ? input.spaceId : [input.spaceId];
        }
        if (input.title != null) params.title = input.title;
        if (input.status != null) {
          params.status = Array.isArray(input.status) ? input.status : [input.status];
        }
        if (input.bodyFormat != null) params['body-format'] = input.bodyFormat;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/pages`,
          Object.keys(params).length > 0 ? { params } : undefined
        );
        return response.data;
      },
    },
    getPage: {
      isTool: false,
      input: GetPageInputSchema,
      handler: async (ctx, input: GetPageInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {};
        if (input.bodyFormat != null) params['body-format'] = input.bodyFormat;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/pages/${encodeURIComponent(input.id)}`,
          Object.keys(params).length > 0 ? { params } : undefined
        );
        return response.data;
      },
    },
    listSpaces: {
      isTool: false,
      input: ListSpacesInputSchema,
      handler: async (ctx, input: ListSpacesInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, unknown> = {
          limit: input.limit ?? DEFAULT_LIST_LIMIT,
        };
        if (input.cursor != null) params.cursor = input.cursor;
        if (input.ids != null) {
          params.ids = Array.isArray(input.ids) ? input.ids : [input.ids];
        }
        if (input.keys != null) {
          params.keys = Array.isArray(input.keys) ? input.keys : [input.keys];
        }
        if (input.type != null) params.type = input.type;
        if (input.status != null) params.status = input.status;
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/spaces`,
          Object.keys(params).length > 0 ? { params } : undefined
        );
        return response.data;
      },
    },
    getSpace: {
      isTool: false,
      input: GetSpaceInputSchema,
      handler: async (ctx, input: GetSpaceInput) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(
          `${baseUrl}${CONFLUENCE_V2_PREFIX}/spaces/${encodeURIComponent(input.id)}`
        );
        return response.data;
      },
    },
  },
  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.confluence.test.description', {
      defaultMessage: 'Verifies Confluence Cloud connection by listing spaces',
    }),
    handler: async (ctx) => {
      try {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}${CONFLUENCE_V2_PREFIX}/spaces`, {
          params: { limit: 1 },
        });
        if (response.status !== 200) {
          return {
            ok: false,
            message: 'Failed to connect to Confluence Cloud API',
          };
        }
        return {
          ok: true,
          message: 'Successfully connected to Confluence Cloud',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, message };
      }
    },
  },

  agentBuilderWorkflows: [getResourceWorkflow, listResourceWorkflow],
};
