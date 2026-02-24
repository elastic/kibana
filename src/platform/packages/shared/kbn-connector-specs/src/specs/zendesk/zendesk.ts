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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';

const buildBaseUrl = (ctx: ActionContext): string =>
  `https://${String((ctx.config?.subdomain as string) ?? '').trim()}.zendesk.com/api/v2`;

export const ZendeskConnector: ConnectorSpec = {
  metadata: {
    id: '.zendesk',
    displayName: 'Zendesk',
    description: i18n.translate('core.kibanaConnectorSpecs.zendesk.metadata.description', {
      defaultMessage:
        'Connect to Zendesk to search and retrieve tickets, users, and Help Center content.',
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
              label: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.password.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.password.helpText', {
                defaultMessage:
                  'Your Zendesk API token (Admin Center > Apps and integrations > APIs)',
              }),
            },
            user: {
              label: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.user.label', {
                defaultMessage: 'Email',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.user.helpText', {
                defaultMessage:
                  'Zendesk account email (use {email}/token as username for API token auth)',
                values: { email: 'your_email@example.com' },
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
        i18n.translate('core.kibanaConnectorSpecs.zendesk.config.subdomain.description', {
          defaultMessage: 'Your Zendesk subdomain',
        })
      )
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.zendesk.config.subdomain.label', {
          defaultMessage: 'Subdomain',
        }),
        placeholder: 'your-company',
        helpText: i18n.translate('core.kibanaConnectorSpecs.zendesk.config.subdomain.helpText', {
          defaultMessage:
            'The subdomain for your Zendesk account (e.g. your-company for https://your-company.zendesk.com)',
        }),
      }),
  }),

  actions: {
    search: {
      isTool: false,
      input: z.object({
        query: z.string(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        page: z.number().optional(),
        perPage: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, string | number | undefined> = {
          query: input.query,
          ...(input.sortBy && { sort_by: input.sortBy }),
          ...(input.sortOrder && { sort_order: input.sortOrder }),
          ...(input.page !== undefined && input.page !== null && { page: input.page }),
          ...(input.perPage !== undefined && input.perPage !== null && { per_page: input.perPage }),
        };
        const response = await ctx.client.get(`${baseUrl}/search`, { params });
        return response.data;
      },
    },

    listTickets: {
      isTool: false,
      input: z.object({
        page: z.number().optional(),
        perPage: z.number().optional(),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, number | undefined> = {};
        if (input.page !== undefined && input.page !== null) params.page = input.page;
        if (input.perPage !== undefined && input.perPage !== null) params.per_page = input.perPage;
        const response = await ctx.client.get(`${baseUrl}/tickets.json`, { params });
        return response.data;
      },
    },

    getTicket: {
      isTool: false,
      input: z.object({
        ticketId: z.string(),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/tickets/${input.ticketId}.json`);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.zendesk.test.description', {
      defaultMessage: 'Verifies Zendesk connection by listing current user',
    }),
    handler: async (ctx) => {
      const baseUrl = buildBaseUrl(ctx);
      try {
        const response = await ctx.client.get(`${baseUrl}/users/me.json`);
        const user = response.data?.user;
        return {
          ok: true,
          message: user
            ? `Successfully connected to Zendesk as ${user.email ?? user.name ?? 'user'}`
            : 'Successfully connected to Zendesk API',
        };
      } catch (error: unknown) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};
