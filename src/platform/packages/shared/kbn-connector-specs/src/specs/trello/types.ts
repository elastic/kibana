/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const trelloId = (label: string) =>
  z
    .string()
    .min(1)
    .max(200)
    .describe(
      `Trello ${label} ID (24-character hex string, e.g. "5f8a1b2c3d4e5f6a7b8c9d0e"), as returned by listBoards, search, or another action.`
    );

const cardPosition = z.union([z.enum(['top', 'bottom']), z.number().positive()]);

export const EmptyInputSchema = lazySchema(() => z.object({}));
export type EmptyInput = z.infer<typeof EmptyInputSchema>;

// Shared by getBoard, listBoardLists, and listBoardCards — all three take only a board ID.
export const BoardIdInputSchema = lazySchema(() =>
  z.object({
    boardId: trelloId('board'),
  })
);
export type BoardIdInput = z.infer<typeof BoardIdInputSchema>;

export const ListListCardsInputSchema = lazySchema(() =>
  z.object({
    listId: trelloId('list'),
  })
);
export type ListListCardsInput = z.infer<typeof ListListCardsInputSchema>;

// Shared by getCard and getCardComments — both take only a card ID.
export const CardIdInputSchema = lazySchema(() =>
  z.object({
    cardId: trelloId('card'),
  })
);
export type CardIdInput = z.infer<typeof CardIdInputSchema>;

export const SearchInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Trello search query. Supports keywords plus operators like board:"Board Name", list:"List Name", ' +
          'due:day|week|month|overdue, label:red, member:username, and is:open|archived. ' +
          'Examples: "login bug", "board:\\"Q3 Roadmap\\" label:red is:open".'
      ),
    modelTypes: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Comma-separated list of result types to search: any of "cards", "boards", "members", "organizations". ' +
          'Defaults to "cards,boards".'
      ),
    idBoards: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Comma-separated Trello board IDs to restrict the search to. Omit to search all boards the member can access.'
      ),
    cardsLimit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of matching cards to return (1-1000). Defaults to 10.'),
    boardsLimit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of matching boards to return (1-1000). Defaults to 10.'),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const CreateCardInputSchema = lazySchema(() =>
  z.object({
    listId: trelloId('list').describe(
      'Trello list ID (24-character hex string) the new card is created in, as returned by listBoardLists.'
    ),
    name: z.string().min(1).max(16384).describe('Title of the new card.'),
    desc: z
      .string()
      .max(16384)
      .optional()
      .describe('Card description text. Supports Trello-flavored Markdown.'),
    due: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe('Due date as an ISO 8601 datetime string, e.g. "2024-06-15T17:00:00.000Z".'),
    pos: cardPosition
      .optional()
      .describe(
        'Position of the card in the list: "top", "bottom", or a positive number. Defaults to "bottom".'
      ),
    idMembers: z
      .string()
      .min(1)
      .max(2000)
      .optional()
      .describe('Comma-separated Trello member IDs to assign to the card.'),
    idLabels: z
      .string()
      .min(1)
      .max(2000)
      .optional()
      .describe('Comma-separated Trello label IDs to apply to the card.'),
  })
);
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>;

export const UpdateCardInputSchema = lazySchema(() =>
  z
    .object({
      cardId: trelloId('card'),
      name: z.string().min(1).max(16384).optional().describe('New title for the card.'),
      desc: z.string().max(16384).optional().describe('New description text for the card.'),
      due: z
        .string()
        .min(1)
        .max(100)
        .nullable()
        .optional()
        .describe(
          'New due date as an ISO 8601 datetime string, or null to clear the due date. ' +
            'Passing null sends the sentinel value "null" that the Trello API requires to remove a due date.'
        ),
      idList: trelloId('list')
        .optional()
        .describe('Target list ID to move the card into a different list.'),
      pos: cardPosition
        .optional()
        .describe('New position within its list: "top", "bottom", or a positive number.'),
      closed: z
        .boolean()
        .optional()
        .describe(
          'Set true to archive the card, or false to unarchive it. This is the only way to remove a card through this connector — there is no hard-delete action.'
        ),
      idMembers: z
        .string()
        .min(1)
        .max(2000)
        .optional()
        .describe(
          'Comma-separated Trello member IDs to assign to the card, replacing the current assignment. Use listBoardMembers to resolve names to IDs.'
        ),
      idLabels: z
        .string()
        .min(1)
        .max(2000)
        .optional()
        .describe(
          'Comma-separated Trello label IDs to apply to the card, replacing the current labels. Use listBoardLabels to resolve label names to IDs.'
        ),
    })
    .refine(
      ({ name, desc, due, idList, pos, closed, idMembers, idLabels }) =>
        [name, desc, due, idList, pos, closed, idMembers, idLabels].some((v) => v !== undefined),
      { message: 'At least one field besides cardId must be provided' }
    )
);
export type UpdateCardInput = z.infer<typeof UpdateCardInputSchema>;

export const AddCommentInputSchema = lazySchema(() =>
  z.object({
    cardId: trelloId('card'),
    text: z.string().min(1).max(16384).describe('Comment text to post on the card.'),
  })
);
export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;
