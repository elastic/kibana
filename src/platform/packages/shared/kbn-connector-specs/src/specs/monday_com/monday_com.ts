/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Monday.com MCP Connector
 *
 * An MCP-native connector that connects to the official remote monday.com MCP server
 * at https://mcp.monday.com/mcp.
 *
 * Auth: OAuth 2.0 Authorization Code flow (recommended) or Personal API Token (bearer)
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  CallToolInput,
  ChangeItemColumnValuesInput,
  CreateItemInput,
  CreateUpdateInput,
  GetBoardInfoInput,
  GetBoardItemsInput,
  GetUpdatesInput,
  SearchInput,
} from './types';
import {
  CallToolInputSchema,
  ChangeItemColumnValuesInputSchema,
  CreateItemInputSchema,
  CreateUpdateInputSchema,
  GetBoardInfoInputSchema,
  GetBoardItemsInputSchema,
  GetUpdatesInputSchema,
  ListToolsInputSchema,
  SearchInputSchema,
  WhoAmIInputSchema,
} from './types';

const MONDAY_MCP_SERVER_URL = 'https://mcp.monday.com/mcp';

export const MondayCom: ConnectorSpec = {
  metadata: {
    id: '.monday_com',
    displayName: 'Monday.com',
    description: i18n.translate('core.kibanaConnectorSpecs.monday_com.metadata.description', {
      defaultMessage:
        'Search boards, read and create items, post updates, and manage workspaces in Monday.com',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        isRecommended: true,
        defaults: {
          authorizationUrl: 'https://auth.monday.com/oauth2/authorize',
          tokenUrl: 'https://auth.monday.com/oauth2/token',
          scope:
            'me:read boards:read boards:write items:read items:write updates:read updates:write',
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      },
      {
        type: 'bearer',
        overrides: {
          label: 'Personal API Token',
        },
        defaults: {},
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(MONDAY_MCP_SERVER_URL)
        .describe('Monday.com MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: MONDAY_MCP_SERVER_URL,
          hidden: true,
          label: i18n.translate('connectorSpecs.monday_com.config.serverUrl.label', {
            defaultMessage: 'MCP server URL',
          }),
          helpText: i18n.translate('connectorSpecs.monday_com.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the official Monday.com remote MCP server.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    // ── Discovery ─────────────────────────────────────────────────────────────
    whoAmI: {
      isTool: true,
      description:
        'Retrieve the current authenticated monday.com user, their account information, and a list ' +
        'of boards and workspaces they have access to. Use this as the first call to orient an agent: ' +
        'it returns user ID, account name, board IDs, and workspace IDs needed for subsequent actions.',
      input: WhoAmIInputSchema,
      handler: async (ctx) => {
        return callToolJson(ctx, 'get_user_context');
      },
    },

    // ── Search ────────────────────────────────────────────────────────────────
    search: {
      isTool: true,
      description:
        'Search Monday.com by keyword within a specific object type. Provide searchTerm and ' +
        'searchType (one of BOARD, DOCUMENTS, FOLDERS, WORKSPACES, UPDATES, ITEMS, ' +
        'TIMELINE_ITEMS, DASHBOARDS). Returns matching objects with names and IDs.',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        return callToolJson(ctx, 'search', {
          searchTerm: input.searchTerm,
          searchType: input.searchType,
        });
      },
    },

    // ── Boards ────────────────────────────────────────────────────────────────
    getBoardInfo: {
      isTool: true,
      description:
        'Get detailed metadata for a Monday.com board, including its columns (with IDs and types), ' +
        'groups, views, and owners. Use this after search or whoAmI to inspect board structure ' +
        'before reading items or updating column values.',
      input: GetBoardInfoInputSchema,
      handler: async (ctx, input: GetBoardInfoInput) => {
        return callToolJson(ctx, 'get_board_info', {
          boardId: input.boardId,
        });
      },
    },

    getBoardItemsPage: {
      isTool: true,
      description:
        'Paginate through all items on a Monday.com board. Returns item names, column values, ' +
        'group membership, and a cursor for the next page. Use cursor from the previous response ' +
        'to fetch subsequent pages. Use getBoardInfo first to understand column IDs.',
      input: GetBoardItemsInputSchema,
      handler: async (ctx, input: GetBoardItemsInput) => {
        return callToolJson(ctx, 'get_board_items_page', {
          boardId: input.boardId,
          cursor: input.cursor,
          limit: input.limit,
        });
      },
    },

    // ── Items ─────────────────────────────────────────────────────────────────
    createItem: {
      isTool: true,
      description:
        'Create a new item (row) on a Monday.com board. Optionally assign it to a specific group ' +
        'and set initial column values. Use getBoardInfo to discover group IDs and column IDs and ' +
        'their expected value formats before calling this action.',
      input: CreateItemInputSchema,
      handler: async (ctx, input: CreateItemInput) => {
        return callToolJson(ctx, 'create_item', {
          boardId: input.boardId,
          name: input.itemName,
          groupId: input.groupId,
          columnValues: input.columnValues != null ? JSON.stringify(input.columnValues) : undefined,
        });
      },
    },

    changeItemColumnValues: {
      isTool: true,
      description:
        'Update one or more column values on an existing Monday.com item. Provide a map of column ' +
        'IDs to new values. Use getBoardInfo to discover column IDs and their expected value formats ' +
        '(e.g., status labels, date strings, person IDs). Returns the updated item.',
      input: ChangeItemColumnValuesInputSchema,
      handler: async (ctx, input: ChangeItemColumnValuesInput) => {
        return callToolJson(ctx, 'change_item_column_values', {
          boardId: input.boardId,
          itemId: input.itemId,
          columnValues: JSON.stringify(input.columnValues),
        });
      },
    },

    // ── Updates (comments) ────────────────────────────────────────────────────
    createUpdate: {
      isTool: true,
      description:
        'Post an update (comment) on a Monday.com item. Use this to add progress notes, ' +
        'status commentary, or any text message to an item thread. Returns the created update ' +
        'including its ID and timestamp.',
      input: CreateUpdateInputSchema,
      handler: async (ctx, input: CreateUpdateInput) => {
        return callToolJson(ctx, 'create_update', {
          itemId: input.itemId,
          body: input.body,
        });
      },
    },

    getUpdates: {
      isTool: true,
      description:
        'Retrieve updates (comments) posted on a Monday.com item or board. Pass objectId (the item ' +
        'or board ID as a string) and objectType ("Item" or "Board"). Returns update text, author, ' +
        'and timestamps in reverse-chronological order.',
      input: GetUpdatesInputSchema,
      handler: async (ctx, input: GetUpdatesInput) => {
        return callToolJson(ctx, 'get_updates', {
          objectId: input.objectId,
          objectType: input.objectType,
          limit: input.limit,
        });
      },
    },

    // ── Escape hatches (always include) ───────────────────────────────────────
    listTools: {
      isTool: true,
      description:
        'List all tools available on the Monday.com MCP server. The server exposes over 60 tools ' +
        'covering boards, items, workspaces, docs, dashboards, automations, AI agents, and more. ' +
        'Use this to discover capabilities not exposed as named actions.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call any tool on the Monday.com MCP server directly by name. Use this as an escape hatch ' +
        'for operations not yet exposed as named actions — for example, creating workspaces, managing ' +
        'automations, creating dashboards, reading docs, or running GraphQL queries. Use listTools ' +
        'first to discover available tool names and their required arguments.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.monday_com.test.description', {
      defaultMessage:
        'Verifies connection to the Monday.com MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to Monday.com MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    '## Monday.com Connector — usage guidance',
    '',
    '### Getting started',
    'Begin with `whoAmI` to identify the authenticated user, their accessible boards, and workspace IDs.',
    'Use board IDs from the response to call `getBoardInfo` or `getBoardItemsPage`.',
    '',
    '### Finding boards and items',
    'Use `search` to find boards or documents by keyword, then `getBoardInfo` to inspect column structure.',
    'To paginate through items on a board, call `getBoardItemsPage` repeatedly with the `cursor` from each response until no cursor is returned.',
    '',
    '### Creating and updating items',
    'Before calling `createItem` or `changeItemColumnValues`, call `getBoardInfo` to discover:',
    '  - Group IDs (for placing items in the right section)',
    '  - Column IDs and their types (status, person, date, text, etc.)',
    '  - The expected value format for each column type',
    '',
    '### Comments and updates',
    'Use `createUpdate` to post a comment on an item and `getUpdates` to read the discussion thread. ' +
      '`getUpdates` requires `objectId` (the item or board ID as a string) and `objectType` ("Item" or "Board").',
    '',
    '### Advanced operations',
    'The Monday.com MCP server exposes 60+ tools. Use `listTools` to discover available tools, then `callTool` to invoke them.',
    '',
    '### Common gotchas',
    '- Board IDs and item IDs are integers. Group IDs and column IDs are strings.',
    '- Column value formats differ by column type — always check with `getBoardInfo` before updating.',
    '- Status columns require a label (text) value, not a numeric ID.',
    '- The `change_item_column_values` tool accepts a JSON-stringified column values object.',
  ].join('\n'),
};
