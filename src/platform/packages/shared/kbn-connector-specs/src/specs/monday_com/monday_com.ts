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
import { UISchemas, type ActionContext, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  ArchiveItemInput,
  CallToolInput,
  ChangeItemColumnValuesInput,
  CreateItemInput,
  CreateNotificationInput,
  CreateSubitemInput,
  CreateUpdateInput,
  DeleteItemInput,
  EditUpdateInput,
  GetBoardInfoInput,
  GetBoardItemsInput,
  GetItemInput,
  GetItemsByColumnValueInput,
  GetUpdatesInput,
  MoveItemToGroupInput,
  SearchInput,
} from './types';
import {
  ArchiveItemInputSchema,
  CallToolInputSchema,
  ChangeItemColumnValuesInputSchema,
  CreateItemInputSchema,
  CreateNotificationInputSchema,
  CreateSubitemInputSchema,
  CreateUpdateInputSchema,
  DeleteItemInputSchema,
  EditUpdateInputSchema,
  GetBoardInfoInputSchema,
  GetBoardItemsInputSchema,
  GetItemInputSchema,
  GetItemsByColumnValueInputSchema,
  GetUpdatesInputSchema,
  ListToolsInputSchema,
  MoveItemToGroupInputSchema,
  SearchInputSchema,
  WhoAmIInputSchema,
} from './types';

const MONDAY_MCP_SERVER_URL = 'https://mcp.monday.com/mcp';
const MONDAY_API_URL = 'https://api.monday.com/v2';

const callGraphQL = async (
  ctx: ActionContext,
  query: string,
  variables: Record<string, unknown>
) => {
  const { data } = await ctx.client.post(MONDAY_API_URL, { query, variables });
  if (data?.errors?.length) {
    throw new Error((data.errors as Array<{ message: string }>).map((e) => e.message).join('; '));
  }
  return data?.data ?? null;
};

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
    getItem: {
      isTool: true,
      description:
        'Retrieve a single Monday.com item by ID. Returns the item name, all column values, ' +
        'group membership, and parent board ID. Use this when you already know the item ID ' +
        'and need its full details without paginating a board.',
      input: GetItemInputSchema,
      handler: async (ctx, input: GetItemInput) => {
        const result = await callGraphQL(
          ctx,
          'query GetItem($ids: [ID!]) { items(ids: $ids) { id name board { id } group { id title } column_values { id text value } } }',
          { ids: [String(input.itemId)] }
        );
        return result?.items?.[0] ?? null;
      },
    },

    getItemsByColumnValue: {
      isTool: true,
      description:
        'Find items on a Monday.com board where a specific column matches a given value. ' +
        'Use getBoardInfo to discover column IDs and the expected value format for each column type. ' +
        'Returns matching items with their names, column values, and group membership.',
      input: GetItemsByColumnValueInputSchema,
      handler: async (ctx, input: GetItemsByColumnValueInput) => {
        const result = await callGraphQL(
          ctx,
          'query GetItemsByColumnValue($boardId: ID!, $columnId: String!, $columnValues: [String!]!, $limit: Int) { items_page_by_column_values(board_id: $boardId, columns: [{ column_id: $columnId, column_values: $columnValues }], limit: $limit) { items { id name group { id title } column_values { id text value } } } }',
          {
            boardId: String(input.boardId),
            columnId: input.columnId,
            columnValues: [input.columnValue],
            limit: input.limit,
          }
        );
        return result?.items_page_by_column_values ?? null;
      },
    },

    createItem: {
      isTool: false,
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
          columnValues: input.columnValues != null ? JSON.stringify(input.columnValues) : '{}',
        });
      },
    },

    changeItemColumnValues: {
      isTool: false,
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

    createSubitem: {
      isTool: false,
      description:
        'Create a subitem under an existing Monday.com item. Subitems share the same column ' +
        "structure as the parent board's subitems board. Returns the created subitem with its ID.",
      input: CreateSubitemInputSchema,
      handler: async (ctx, input: CreateSubitemInput) => {
        const result = await callGraphQL(
          ctx,
          'mutation CreateSubitem($parentItemId: ID!, $itemName: String!, $columnValues: JSON) { create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) { id name board { id } } }',
          {
            parentItemId: String(input.parentItemId),
            itemName: input.subitemName,
            columnValues: input.columnValues != null ? JSON.stringify(input.columnValues) : null,
          }
        );
        return result?.create_subitem ?? null;
      },
    },

    moveItemToGroup: {
      isTool: false,
      description:
        'Move a Monday.com item to a different group within the same board. Use getBoardInfo to ' +
        'discover available group IDs. Returns the moved item with its updated group.',
      input: MoveItemToGroupInputSchema,
      handler: async (ctx, input: MoveItemToGroupInput) => {
        const result = await callGraphQL(
          ctx,
          'mutation MoveItem($itemId: ID!, $groupId: String!) { move_item_to_group(item_id: $itemId, group_id: $groupId) { id } }',
          { itemId: String(input.itemId), groupId: input.groupId }
        );
        return result?.move_item_to_group ?? null;
      },
    },

    archiveItem: {
      isTool: false,
      description:
        'Archive a Monday.com item. Archived items are hidden from the board view but remain ' +
        'accessible via filters and are not permanently deleted. Returns the archived item.',
      input: ArchiveItemInputSchema,
      handler: async (ctx, input: ArchiveItemInput) => {
        const result = await callGraphQL(
          ctx,
          'mutation ArchiveItem($itemId: ID!) { archive_item(item_id: $itemId) { id } }',
          { itemId: String(input.itemId) }
        );
        return result?.archive_item ?? null;
      },
    },

    deleteItem: {
      isTool: false,
      description:
        'Permanently delete a Monday.com item and all its subitems and updates. ' +
        'This action cannot be undone. Returns the deleted item ID.',
      input: DeleteItemInputSchema,
      handler: async (ctx, input: DeleteItemInput) => {
        const result = await callGraphQL(
          ctx,
          'mutation DeleteItem($itemId: ID!) { delete_item(item_id: $itemId) { id } }',
          { itemId: String(input.itemId) }
        );
        return result?.delete_item ?? null;
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

    editUpdate: {
      isTool: true,
      description:
        'Edit the body of an existing update (comment) on a Monday.com item. Use getUpdates to ' +
        'retrieve the update ID. Replaces the full body text; returns the updated update.',
      input: EditUpdateInputSchema,
      handler: async (ctx, input: EditUpdateInput) => {
        const result = await callGraphQL(
          ctx,
          'mutation EditUpdate($id: ID!, $body: String!) { edit_update(id: $id, body: $body) { id body } }',
          { id: String(input.updateId), body: input.body }
        );
        return result?.edit_update ?? null;
      },
    },

    createNotification: {
      isTool: true,
      description:
        'Send an in-app notification to a Monday.com user. Set targetType to "Project" to link ' +
        'to an item, or "Post" to link to an update (comment). Use whoAmI to look up user IDs.',
      input: CreateNotificationInputSchema,
      handler: async (ctx, input: CreateNotificationInput) => {
        return callToolJson(ctx, 'create_notification', {
          user_id: input.userId,
          target_id: input.targetId,
          text: input.text,
          target_type: input.targetType,
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
      await withMcpClient(ctx, async (mcp) => {
        await mcp.listTools();
      });
      return {};
    },
    enabled: true,
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
    'To paginate through all items on a board, call `getBoardItemsPage` repeatedly with the `cursor` from each response until no cursor is returned.',
    'To fetch a single known item, prefer `getItem` over paginating the whole board.',
    'To find items where a column matches a value (e.g. status = "Done"), use `getItemsByColumnValue` — call `getBoardInfo` first to learn the column ID and value format.',
    '',
    '### Writing items (Workflows only)',
    'The following actions are available in Workflows but not as AI agent tools:',
    '- `createItem`: creates a new board item. `itemName` is required; `groupId` and `columnValues` are optional.',
    '- `changeItemColumnValues`: updates column values on an existing item. Pass a `columnValues` map keyed by column ID.',
    '- `createSubitem`: creates a subitem under a parent item by `parentItemId`.',
    '- `moveItemToGroup`: moves an item to a different group within the same board. Use `getBoardInfo` to discover group IDs.',
    '- `archiveItem`: hides an item from the board without deleting it (reversible via Monday.com UI).',
    '- `deleteItem`: permanently deletes an item and all its subitems and updates. Cannot be undone.',
    '',
    '### Comments and updates',
    'Use `createUpdate` to post a comment on an item and `getUpdates` to read the discussion thread.',
    '`getUpdates` requires `objectId` (the item or board ID as a string) and `objectType` ("Item" or "Board").',
    'To edit an existing comment, call `editUpdate` with the update ID from `getUpdates`.',
    '',
    '### Notifications',
    'Use `createNotification` to send an in-app notification to a user. Set `targetType` to "Project" to link to an item, or "Post" to link to an update.',
    'Use `whoAmI` to look up user IDs.',
    '',
    '### Advanced operations',
    'The Monday.com MCP server exposes 60+ tools. Use `listTools` to discover available tools, then `callTool` to invoke them.',
    '',
    '### Common gotchas',
    '- Board IDs and item IDs are integers. Group IDs and column IDs are strings.',
    '- Column value formats differ by column type — always check with `getBoardInfo` before updating.',
    '- Status columns require a label (text) value, not a numeric ID.',
    '- `createNotification`: set `targetType` to "Project" for items or "Post" for updates.',
  ].join('\n'),
};
