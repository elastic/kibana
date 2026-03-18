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
              label: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.password.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.password.helpText', {
                defaultMessage:
                  'Your Zendesk API token (Admin Center > Apps and integrations > APIs)',
              }),
            },
            username: {
              label: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.username.label', {
                defaultMessage: 'Email',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.zendesk.auth.username.helpText', {
                defaultMessage:
                  'Your Zendesk account email; add "/token" at the end for API token auth (e.g. your_email@example.com/token)',
              }),
              placeholder: 'your_email@example.com/token',
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
      input: z.object({
        query: z.string().describe(
          i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.query', {
            defaultMessage: 'Search query (e.g. status:open, type:ticket)',
          })
        ),
        sortBy: z
          .string()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.sortBy', {
              defaultMessage: 'Field to sort results by',
            })
          ),
        sortOrder: z
          .enum(['asc', 'desc'])
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.sortOrder', {
              defaultMessage: 'Sort direction',
            })
          ),
        page: z
          .number()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.page', {
              defaultMessage: 'Page number for pagination',
            })
          ),
        perPage: z
          .number()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.perPage', {
              defaultMessage: 'Number of results per page',
            })
          ),
        include: z
          .string()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.search.input.include', {
              defaultMessage: 'Comma-separated list of resources to sideload',
            })
          ),
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
        if (input.include) params.include = input.include;
        const response = await ctx.client.get(`${baseUrl}/search`, { params });
        return response.data;
      },
    },

    listTickets: {
      input: z.object({
        page: z
          .number()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.listTickets.input.page', {
              defaultMessage: 'Page number for pagination',
            })
          ),
        perPage: z
          .number()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.listTickets.input.perPage', {
              defaultMessage: 'Number of tickets per page (max 100)',
            })
          ),
        include: z
          .string()
          .optional()
          .describe(
            i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.listTickets.input.include', {
              defaultMessage:
                'Comma-separated sideloads, e.g. users, users,groups, users,groups,organizations',
            })
          ),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, string | number | undefined> = {};
        if (input.page !== undefined && input.page !== null) params.page = input.page;
        if (input.perPage !== undefined && input.perPage !== null) params.per_page = input.perPage;
        if (input.include) params.include = input.include;
        const response = await ctx.client.get(`${baseUrl}/tickets.json`, { params });
        return response.data;
      },
    },

    getTicket: {
      input: z.object({
        ticketId: z.string().describe(
          i18n.translate('core.kibanaConnectorSpecs.zendesk.actions.getTicket.input.ticketId', {
            defaultMessage: 'The Zendesk ticket ID',
          })
        ),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/tickets/${input.ticketId}.json`, {
          params: { include: 'comment_count' },
        });
        return response.data;
      },
    },

    getTicketComments: {
      input: z.object({
        ticketId: z
          .string()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.zendesk.actions.getTicketComments.input.ticketId',
              { defaultMessage: 'The Zendesk ticket ID' }
            )
          ),
        page: z
          .number()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.zendesk.actions.getTicketComments.input.page',
              { defaultMessage: 'Page number for pagination' }
            )
          ),
        perPage: z
          .number()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.zendesk.actions.getTicketComments.input.perPage',
              { defaultMessage: 'Number of comments per page' }
            )
          ),
        include: z
          .string()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.zendesk.actions.getTicketComments.input.include',
              { defaultMessage: 'Comma-separated list of resources to sideload (e.g. users)' }
            )
          ),
        includeInlineImages: z
          .boolean()
          .optional()
          .describe(
            i18n.translate(
              'core.kibanaConnectorSpecs.zendesk.actions.getTicketComments.input.includeInlineImages',
              { defaultMessage: 'Whether to include inline images in comment bodies' }
            )
          ),
      }),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const params: Record<string, string | number | boolean | undefined> = {};
        if (input.page !== undefined && input.page !== null) params.page = input.page;
        if (input.perPage !== undefined && input.perPage !== null) params.per_page = input.perPage;
        if (input.include) params.include = input.include;
        if (input.includeInlineImages !== undefined)
          params.include_inline_images = input.includeInlineImages;
        const response = await ctx.client.get(
          `${baseUrl}/tickets/${input.ticketId}/comments.json`,
          { params }
        );
        return response.data;
      },
    },

    whoAmI: {
      input: z.object({}),
      handler: async (ctx) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/users/me.json`);
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
