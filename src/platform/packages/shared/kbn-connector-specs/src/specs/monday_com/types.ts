/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// All schemas use lazySchema() — do not use bare z.object().
// All z.string() fields must have .max(N).
// Parameter names follow camelCase to match the monday.com MCP server and API.
// Integer fields use z.coerce.number() so Workflow string inputs are accepted.
// =============================================================================

export const WhoAmIInputSchema = lazySchema(() => z.object({}));
export type WhoAmIInput = z.infer<typeof WhoAmIInputSchema>;

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchInputSchema = lazySchema(() =>
  z.object({
    searchTerm: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Full-text search term across monday.com. Example: "Q3 roadmap" or "customer onboarding". Must be non-empty'
      ),
    searchType: z
      .enum([
        'BOARD',
        'DOCUMENTS',
        'FOLDERS',
        'WORKSPACES',
        'UPDATES',
        'ITEMS',
        'TIMELINE_ITEMS',
        'DASHBOARDS',
      ])
      .describe(
        'The type of object to search. Must be one of: BOARD, DOCUMENTS, FOLDERS, WORKSPACES, ' +
          'UPDATES, ITEMS, TIMELINE_ITEMS, DASHBOARDS.'
      ),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetBoardInfoInputSchema = lazySchema(() =>
  z.object({
    boardId: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        'The integer ID of the board to retrieve. Use the ID returned by the search action or whoAmI.'
      ),
  })
);
export type GetBoardInfoInput = z.infer<typeof GetBoardInfoInputSchema>;

export const GetBoardItemsInputSchema = lazySchema(() =>
  z.object({
    boardId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the board to list items from.'),
    cursor: z
      .string()
      .max(1024)
      .optional()
      .describe(
        'Pagination cursor returned by a previous call to this action. ' +
          'Leave empty to start from the first page.'
      ),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(50)
      .describe('Maximum number of items to return per page (1–500, default 50).'),
  })
);
export type GetBoardItemsInput = z.infer<typeof GetBoardItemsInputSchema>;

export const GetItemInputSchema = lazySchema(() =>
  z.object({
    itemId: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        'The integer ID of the item to retrieve. Returns the item name, column values, group, and board.'
      ),
  })
);
export type GetItemInput = z.infer<typeof GetItemInputSchema>;

export const GetItemsByColumnValueInputSchema = lazySchema(() =>
  z.object({
    boardId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the board to search within.'),
    columnId: z
      .string()
      .min(1)
      .max(200)
      .describe('The ID of the column to filter on. Use getBoardInfo to discover column IDs.'),
    columnValue: z
      .string()
      .min(1)
      .max(2000)
      .describe('The value to match against. For status columns, pass the label text.'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(50)
      .describe('Maximum number of items to return (1–500, default 50).'),
  })
);
export type GetItemsByColumnValueInput = z.infer<typeof GetItemsByColumnValueInputSchema>;

export const CreateItemInputSchema = lazySchema(() =>
  z.object({
    boardId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the board where the item will be created.'),
    itemName: z
      .string()
      .min(1)
      .max(500)
      .describe('The name (title) of the new item. Example: "Fix login bug" or "Q4 planning".'),
    groupId: z
      .string()
      .max(200)
      .optional()
      .describe(
        'ID of the group within the board to add the item to. ' +
          'If omitted, the item is added to the first group. ' +
          'Use getBoardInfo to discover group IDs.'
      ),
    columnValues: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Initial column values for the item, keyed by column ID. ' +
          'Values must conform to the monday.com column value format for each column type. ' +
          'Use getBoardInfo to discover column IDs and types.'
      ),
  })
);
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>;

export const ChangeItemColumnValuesInputSchema = lazySchema(() =>
  z.object({
    boardId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the board that contains the item.'),
    itemId: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        'The integer ID of the item to update. Use IDs returned by getBoardItemsPage or search.'
      ),
    columnValues: z
      .record(z.string().max(200), z.unknown())
      .describe(
        'Column values to update, keyed by column ID. ' +
          'Values must conform to the monday.com column value format for each column type. ' +
          'Use getBoardInfo to discover column IDs and their expected value formats.'
      ),
  })
);
export type ChangeItemColumnValuesInput = z.infer<typeof ChangeItemColumnValuesInputSchema>;

export const CreateSubitemInputSchema = lazySchema(() =>
  z.object({
    parentItemId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the parent item to create the subitem under.'),
    subitemName: z.string().min(1).max(500).describe('The name (title) of the new subitem.'),
    columnValues: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Initial column values for the subitem, keyed by column ID. ' +
          'Values must conform to the monday.com column value format for each column type.'
      ),
  })
);
export type CreateSubitemInput = z.infer<typeof CreateSubitemInputSchema>;

export const MoveItemToGroupInputSchema = lazySchema(() =>
  z.object({
    itemId: z.coerce.number().int().positive().describe('The integer ID of the item to move.'),
    groupId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The ID of the destination group within the same board. Use getBoardInfo to discover group IDs.'
      ),
  })
);
export type MoveItemToGroupInput = z.infer<typeof MoveItemToGroupInputSchema>;

export const ArchiveItemInputSchema = lazySchema(() =>
  z.object({
    itemId: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        'The integer ID of the item to archive. Archived items are hidden but not deleted.'
      ),
  })
);
export type ArchiveItemInput = z.infer<typeof ArchiveItemInputSchema>;

export const DeleteItemInputSchema = lazySchema(() =>
  z.object({
    itemId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the item to permanently delete.'),
  })
);
export type DeleteItemInput = z.infer<typeof DeleteItemInputSchema>;

export const CreateUpdateInputSchema = lazySchema(() =>
  z.object({
    itemId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the item to post the update (comment) on.'),
    body: z
      .string()
      .min(1)
      .max(10000)
      .describe('The text content of the update (comment). Supports basic markdown formatting.'),
  })
);
export type CreateUpdateInput = z.infer<typeof CreateUpdateInputSchema>;

export const GetUpdatesInputSchema = lazySchema(() =>
  z.object({
    objectId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The ID of the item or board whose updates (comments) you want to retrieve — ' +
          'not an update/comment ID. Pass the item or board integer ID as a string.'
      ),
    objectType: z
      .enum(['Item', 'Board'])
      .default('Item')
      .describe('The type of object: "Item" (default) or "Board".'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(25)
      .describe('Maximum number of updates to return (1–100, default 25).'),
  })
);
export type GetUpdatesInput = z.infer<typeof GetUpdatesInputSchema>;

export const EditUpdateInputSchema = lazySchema(() =>
  z.object({
    updateId: z.coerce
      .number()
      .int()
      .positive()
      .describe(
        'The integer ID of the update (comment) to edit. Use getUpdates to retrieve update IDs.'
      ),
    body: z
      .string()
      .min(1)
      .max(10000)
      .describe('The new text content for the update. Replaces the existing body.'),
  })
);
export type EditUpdateInput = z.infer<typeof EditUpdateInputSchema>;

export const CreateNotificationInputSchema = lazySchema(() =>
  z.object({
    userId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the user to notify. Use whoAmI to look up user IDs.'),
    targetId: z.coerce
      .number()
      .int()
      .positive()
      .describe('The integer ID of the target object (item or update) the notification links to.'),
    text: z.string().min(1).max(1000).describe('The notification message text.'),
    targetType: z
      .enum(['Project', 'Post'])
      .describe(
        '"Project" for item-level notifications, "Post" for update (comment) level notifications.'
      ),
  })
);
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the monday.com MCP tool to call (use listTools to discover available names). ' +
          'Examples: "create_board", "create_workspace", "list_workspaces".'
      ),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe(
        'Arguments to pass to the tool. Tool-specific; use listTools to see parameter details.'
      ),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
