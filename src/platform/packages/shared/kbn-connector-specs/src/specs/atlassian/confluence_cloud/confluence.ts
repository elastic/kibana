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
import type { ListPagesInput, GetPageInput, ListSpacesInput, GetSpaceInput } from './types';
import {
  ListPagesInputSchema,
  GetPageInputSchema,
  ListSpacesInputSchema,
  GetSpaceInputSchema,
} from './types';

const ATLASSIAN_MCP_SERVER_URL = 'https://mcp.atlassian.com/v1/sse';

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
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://auth.atlassian.com/authorize',
          tokenUrl: 'https://auth.atlassian.com/oauth/token',
          scope:
            'read:confluence-content.all read:confluence-space.summary read:confluence-content.permission search:confluence offline_access',
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
        .default(ATLASSIAN_MCP_SERVER_URL)
        .describe('Atlassian MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: ATLASSIAN_MCP_SERVER_URL,
          hidden: true,
          label: i18n.translate('core.kibanaConnectorSpecs.confluence.config.serverUrl.label', {
            defaultMessage: 'MCP server URL',
          }),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.confluence.config.serverUrl.helpText',
            {
              defaultMessage: 'The URL of the official Atlassian remote MCP server.',
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    listPages: {
      description:
        'List Confluence pages. Use when you need to find pages, optionally filtered by space, title, or status. Supports pagination via cursor.',
      isTool: true,
      input: ListPagesInputSchema,
      handler: async (ctx, input: ListPagesInput) => {
        return callToolJson(ctx, 'confluence_list_pages', {
          limit: input.limit,
          cursor: input.cursor,
          space_id: input.spaceId,
          title: input.title,
          status: input.status,
        });
      },
    },

    getPage: {
      description:
        'Fetch full details of a single Confluence page by its ID. Use when you already have the page ID and need the complete record including its content.',
      isTool: true,
      input: GetPageInputSchema,
      handler: async (ctx, input: GetPageInput) => {
        return callToolJson(ctx, 'confluence_get_page', {
          page_id: input.id,
        });
      },
    },

    listSpaces: {
      description:
        'List Confluence spaces. Use when you need to discover available spaces or find a specific space by type. Supports pagination via cursor.',
      isTool: true,
      input: ListSpacesInputSchema,
      handler: async (ctx, input: ListSpacesInput) => {
        return callToolJson(ctx, 'confluence_list_spaces', {
          limit: input.limit,
          type: input.type,
        });
      },
    },

    getSpace: {
      description:
        'Fetch full details of a single Confluence space by its ID. Use when you already have the space ID and need the complete record.',
      isTool: true,
      input: GetSpaceInputSchema,
      handler: async (ctx, input: GetSpaceInput) => {
        return callToolJson(ctx, 'confluence_get_space', {
          space_key: input.id,
        });
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.confluence.test.description', {
      defaultMessage: 'Verifies connection to the Atlassian MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to Atlassian MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    'Typical pattern: listSpaces → listPages (with spaceId) → getPage to retrieve page details.',
    '- For capabilities not yet exposed as named actions: listTools to discover, callTool to invoke.',
  ].join('\n'),
};
