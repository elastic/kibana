/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { RETRY_RATE_LIMIT } from '../../connector_spec';
import type { ConnectorSpec, ActionContext } from '../../connector_spec';
import {
  EmptyInputSchema,
  BoardIdInputSchema,
  ListListCardsInputSchema,
  CardIdInputSchema,
  SearchInputSchema,
  CreateCardInputSchema,
  UpdateCardInputSchema,
  AddCommentInputSchema,
} from './types';
import type {
  BoardIdInput,
  ListListCardsInput,
  CardIdInput,
  SearchInput,
  CreateCardInput,
  UpdateCardInput,
  AddCommentInput,
} from './types';

const BASE_URL = 'https://api.trello.com/1';

const fetchCurrentMember = async (ctx: ActionContext) => {
  const response = await ctx.client.get(`${BASE_URL}/members/me`);
  return response.data;
};

export const Trello: ConnectorSpec = {
  metadata: {
    id: '.trello',
    displayName: 'Trello',
    description: i18n.translate('connectorSpecs.trello.metadata.description', {
      defaultMessage: 'Search, read, and manage boards, lists, and cards in Trello',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_query',
        defaults: { paramNames: ['key', 'token'] },
        overrides: {
          meta: {
            key: {
              label: i18n.translate('connectorSpecs.trello.auth.key.label', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate('connectorSpecs.trello.auth.key.helpText', {
                defaultMessage:
                  'Get this from https://trello.com/power-ups/admin — create or open a Power-Up, then generate a key on its "API Key" tab.',
              }),
            },
            token: {
              label: i18n.translate('connectorSpecs.trello.auth.token.label', {
                defaultMessage: 'API token',
              }),
              helpText: i18n.translate('connectorSpecs.trello.auth.token.helpText', {
                defaultMessage:
                  'Trello does not display tokens in its UI. Copy this URL, replace YOUR_API_KEY with the key entered above, and open it in a browser: https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_API_KEY — click Allow, then paste the token shown on the resulting page here.',
              }),
            },
          },
        },
      },
    ],
  },

  policies: {
    retry: {
      retryOnStatusCodes: [...RETRY_RATE_LIMIT],
      maxRetries: 3,
      backoffStrategy: 'exponential',
    },
  },

  actions: {
    whoAmI: {
      isTool: true,
      description:
        'Get the currently authenticated Trello member. Returns the member record for the API key/token in use. Useful for verifying which account is connected or resolving your own member ID.',
      input: EmptyInputSchema,
      handler: fetchCurrentMember,
    },

    listBoards: {
      isTool: true,
      description:
        'List all boards the authenticated member belongs to. Use to discover boards and their IDs before drilling into lists or cards.',
      input: EmptyInputSchema,
      handler: async (ctx) => {
        const response = await ctx.client.get(`${BASE_URL}/members/me/boards`);
        return response.data;
      },
    },

    getBoard: {
      isTool: true,
      description:
        'Get the full details of a single Trello board by ID. Use when you already have a board ID and need its metadata.',
      input: BoardIdInputSchema,
      handler: async (ctx, input: BoardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/boards/${encodeURIComponent(input.boardId)}`
        );
        return response.data;
      },
    },

    listBoardLists: {
      isTool: true,
      description:
        'List the (open) lists on a board, e.g. "To Do", "Doing", "Done". Use the returned list IDs with listListCards or createCard.',
      input: BoardIdInputSchema,
      handler: async (ctx, input: BoardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/boards/${encodeURIComponent(input.boardId)}/lists`
        );
        return response.data;
      },
    },

    listBoardCards: {
      isTool: true,
      description:
        'List all open cards on a board, across all of its lists. Returns every card with no limit — for large boards this can be hundreds of records. For large boards, prefer search() with idBoards to cap results. Use when you need every card on a board rather than one list at a time.',
      input: BoardIdInputSchema,
      handler: async (ctx, input: BoardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/boards/${encodeURIComponent(input.boardId)}/cards`
        );
        return response.data;
      },
    },

    listBoardLabels: {
      isTool: true,
      description:
        'List the labels defined on a board. Returns label IDs, names, and colors. Call this before createCard or updateCard to resolve label names to IDs for the idLabels parameter.',
      input: BoardIdInputSchema,
      handler: async (ctx, input: BoardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/boards/${encodeURIComponent(input.boardId)}/labels`
        );
        return response.data;
      },
    },

    listBoardMembers: {
      isTool: true,
      description:
        'List the members (collaborators) of a board. Returns member IDs, usernames, and full names. Call this before createCard or updateCard to resolve member names to IDs for the idMembers parameter.',
      input: BoardIdInputSchema,
      handler: async (ctx, input: BoardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/boards/${encodeURIComponent(input.boardId)}/members`
        );
        return response.data;
      },
    },

    listListCards: {
      isTool: true,
      description:
        "List the open cards within a single list. Use once you have a list ID (from listBoardLists) and want just that list's cards.",
      input: ListListCardsInputSchema,
      handler: async (ctx, input: ListListCardsInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/lists/${encodeURIComponent(input.listId)}/cards`
        );
        return response.data;
      },
    },

    getCard: {
      isTool: true,
      description:
        'Get the full details of a single card by ID, including its description, due date, members, and labels. Use when you already have a card ID and need the complete record.',
      input: CardIdInputSchema,
      handler: async (ctx, input: CardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/cards/${encodeURIComponent(input.cardId)}`
        );
        return response.data;
      },
    },

    getCardComments: {
      isTool: true,
      description:
        'List comments posted on a card (the conversation thread). Use when you have a card ID and need to read its discussion history.',
      input: CardIdInputSchema,
      handler: async (ctx, input: CardIdInput) => {
        const response = await ctx.client.get(
          `${BASE_URL}/cards/${encodeURIComponent(input.cardId)}/actions`,
          {
            params: { filter: 'commentCard' },
          }
        );
        return response.data;
      },
    },

    search: {
      isTool: true,
      description:
        'Search across Trello boards and cards by keyword or query operators. Use when you need to find items by keyword rather than browsing a known board/list.',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const params: Record<string, string | number> = {
          query: input.query,
          modelTypes: input.modelTypes || 'cards,boards',
          cards_limit: input.cardsLimit ?? 10,
          boards_limit: input.boardsLimit ?? 10,
        };
        if (input.idBoards) params.idBoards = input.idBoards;
        const response = await ctx.client.get(`${BASE_URL}/search`, { params });
        return response.data;
      },
    },

    createCard: {
      isTool: true,
      description:
        'Create a new card in a list. Returns the created card, including its ID. Use listBoardLists first to find the target list ID.',
      input: CreateCardInputSchema,
      handler: async (ctx, input: CreateCardInput) => {
        const body = new URLSearchParams();
        body.set('idList', input.listId);
        body.set('name', input.name);
        if (input.desc !== undefined) body.set('desc', input.desc);
        if (input.due !== undefined) body.set('due', input.due);
        if (input.pos !== undefined) body.set('pos', String(input.pos));
        if (input.idMembers) body.set('idMembers', input.idMembers);
        if (input.idLabels) body.set('idLabels', input.idLabels);
        const response = await ctx.client.post(`${BASE_URL}/cards`, body);
        return response.data;
      },
    },

    updateCard: {
      isTool: true,
      description:
        "Edit a card's fields, move it to another list, or archive/unarchive it. Set idList to move the card, or closed: true to archive it (there is no hard-delete action). Returns the updated card.",
      input: UpdateCardInputSchema,
      handler: async (ctx, input: UpdateCardInput) => {
        const body = new URLSearchParams();
        if (input.name !== undefined) body.set('name', input.name);
        if (input.desc !== undefined) body.set('desc', input.desc);
        if (input.due !== undefined) body.set('due', input.due ?? 'null');
        if (input.idList !== undefined) body.set('idList', input.idList);
        if (input.pos !== undefined) body.set('pos', String(input.pos));
        if (input.closed !== undefined) body.set('closed', String(input.closed));
        if (input.idMembers !== undefined) body.set('idMembers', input.idMembers);
        if (input.idLabels !== undefined) body.set('idLabels', input.idLabels);
        const response = await ctx.client.put(
          `${BASE_URL}/cards/${encodeURIComponent(input.cardId)}`,
          body
        );
        return response.data;
      },
    },

    addComment: {
      isTool: true,
      description:
        "Post a comment on a card. Use to leave notes or updates on a card's activity feed. Returns the created comment action.",
      input: AddCommentInputSchema,
      handler: async (ctx, input: AddCommentInput) => {
        const body = new URLSearchParams({ text: input.text });
        const response = await ctx.client.post(
          `${BASE_URL}/cards/${encodeURIComponent(input.cardId)}/actions/comments`,
          body
        );
        return response.data;
      },
    },
  },

  skill: [
    'Trello connector — usage guidance for LLMs.',
    '',
    '## Typical workflow',
    'To find a board: call listBoards (or search if you only know a keyword), then getBoard for its metadata.',
    'To browse a board: call listBoardLists to see its lists, then listBoardCards or listListCards for the cards in it.',
    'To read a specific card: call getCard for its details, then getCardComments for its discussion history.',
    'Example: search(query: "login bug") → getCard(cardId) → getCardComments(cardId).',
    '',
    '## Writing cards',
    'To create a card, first find the target list ID via listBoardLists, then call createCard with that listId.',
    'To assign labels or members, resolve names to IDs first: call listBoardLabels (for idLabels) ' +
      'and listBoardMembers (for idMembers).',
    'Use updateCard to edit fields, move (idList), archive/unarchive (closed), or clear the due date (due: null).',
    'To comment on a card, use addComment.',
    '',
    '## Rate limits',
    'Trello enforces per-key and per-token rate limits (300 requests/10s per API key, 100 requests/10s per ' +
      'token). Avoid issuing large numbers of rapid calls in a loop; batch or narrow requests where possible.',
  ].join('\n'),

  test: {
    enabled: true,
    description: i18n.translate('connectorSpecs.trello.test.description', {
      defaultMessage: 'Verifies Trello connection by fetching the current member',
    }),
    handler: fetchCurrentMember,
  },
};
