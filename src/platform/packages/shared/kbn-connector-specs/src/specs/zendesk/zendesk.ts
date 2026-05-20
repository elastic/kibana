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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
const buildBaseUrl = (ctx: ActionContext): string =>
  `https://${String((ctx.config?.subdomain as string) ?? '').trim()}.zendesk.com/api/v2`;

export const ZendeskConnector: ConnectorSpec = {
  metadata: {
    id: '.zendesk',
    displayName: 'Zendesk',
    description: i18n.translate('core.kibanaConnectorSpecs.zendesk.metadata.description', {
      defaultMessage: 'Search and retrieve tickets, users, and Help Center content in Zendesk',
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

  schema: lazySchema(() =>
    z.object({
      subdomain: z
        .string()
        .min(1)
        .describe('Your Zendesk subdomain')
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
    })
  ),

  actions: {
    search: {
      isTool: true,
      description:
        'Search across Zendesk data (tickets, users, organizations, articles). Use when you need to find items by keyword or criteria.',
      input: lazySchema(() =>
        z.object({
          query: z
            .string()
            .describe(
              'Zendesk query syntax. Supports keywords, field filters (field:value), type filters (type:ticket|user|organization|group), status filters (status:open|pending|solved|closed), assignee filters (assignee:me or assignee:<email>), tags (tags:<tag_name>), date filters (created>YYYY-MM-DD, updated<YYYY-MM-DD), and exact phrases ("exact phrase"). Combine filters with spaces. Examples: "type:ticket status:open assignee:me tags:billing", "crawler", "type:user john".'
            ),
          sortBy: z
            .string()
            .optional()
            .describe(
              'Field to sort results by. Valid values: updated_at, created_at, priority, status, ticket_type. Omit to sort by relevance (default).'
            ),
          sortOrder: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Sort direction. "desc" is the default when sortBy is provided.'),
          page: z.number().optional().describe('Page number for pagination.'),
          perPage: z
            .number()
            .optional()
            .describe(
              'Number of results per page (max 100). The Search API returns up to 1000 results total across all pages.'
            ),
          include: z
            .string()
            .optional()
            .describe(
              'Sideload related resources using parentheses format with no spaces: type(sideload). The type must match your query type. Examples: tickets(users), tickets(users,groups), users(identities). Use tickets(...) when querying type:ticket, users(...) when querying type:user.'
            ),
        })
      ),
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
      isTool: true,
      description:
        'List Zendesk tickets. Use when you need to browse or filter tickets by page. For keyword or criteria-based lookups, prefer the search action instead.',
      input: lazySchema(() =>
        z.object({
          page: z.number().default(1).describe('Page number for pagination. Defaults to 1.'),
          perPage: z
            .number()
            .max(100)
            .default(25)
            .describe('Number of tickets per page (max 100). Defaults to 25.'),
          include: z
            .string()
            .optional()
            .describe(
              'Comma-separated sideloads with no spaces. Valid options: users, groups, organizations. Examples: "users", "users,groups", "users,groups,organizations".'
            ),
        })
      ),
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
      isTool: true,
      description:
        'Get the full details of a single Zendesk ticket by ID, including metadata and comment count. Use when you already have a ticket ID and need the complete record.',
      input: lazySchema(() =>
        z.object({
          ticketId: z.string().describe('The Zendesk ticket ID (numeric, e.g. "12345").'),
        })
      ),
      handler: async (ctx, input) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/tickets/${input.ticketId}.json`, {
          params: { include: 'comment_count' },
        });
        return response.data;
      },
    },

    getTicketComments: {
      isTool: true,
      description:
        'List comments on a Zendesk ticket (the conversation thread, including both public and private comments). Use when you have a ticket ID and need to read the full discussion.',
      input: lazySchema(() =>
        z.object({
          ticketId: z.string().describe('The Zendesk ticket ID (numeric, e.g. "12345").'),
          page: z.number().default(1).describe('Page number for pagination. Defaults to 1.'),
          perPage: z
            .number()
            .max(100)
            .default(25)
            .describe('Number of comments per page (max 100). Defaults to 25.'),
          include: z
            .string()
            .optional()
            .describe(
              'Comma-separated list of resources to sideload (e.g. "users" to include author details).'
            ),
          includeInlineImages: z
            .boolean()
            .optional()
            .describe(
              'When true, inline images are included in comment bodies. Defaults to false.'
            ),
        })
      ),
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
      isTool: true,
      description:
        'Get the currently authenticated Zendesk user. Returns the user record for the API credentials in use. Useful for verifying which account is connected or resolving your own agent/user ID.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        const baseUrl = buildBaseUrl(ctx);
        const response = await ctx.client.get(`${baseUrl}/users/me.json`);
        return response.data;
      },
    },
  },

  skill: [
    'Zendesk connector — usage guidance for LLMs.',
    '',
    '## Typical workflow',
    'When a user asks about a ticket by keyword or description, start with search to find the ticket ID,',
    'then call getTicket for full metadata, then getTicketComments to read the conversation thread.',
    'Example: search(query: "type:ticket login issue") → getTicket(ticketId) → getTicketComments(ticketId).',
    '',
    '## Pagination',
    '- Keep perPage low (25 or less) to avoid large payloads.',
    '- For getTicketComments, paginate with page/perPage if comment_count on the ticket is high.',
    '',
    '## whoAmI',
    'Call whoAmI to identify the currently authenticated agent (e.g. to resolve "assignee:me" to a real',
    'user ID, or to confirm which Zendesk account is configured).',
  ].join('\n'),

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
