/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Trello } from './trello';

const BASE_URL = 'https://api.trello.com/1';

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

const mockContext = {
  client: mockClient,
  log: {},
} as unknown as ActionContext;

describe('Trello', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Trello).toBeDefined();
  });

  it('has the expected metadata', () => {
    expect(Trello.metadata.id).toBe('.trello');
    expect(Trello.metadata.minimumLicense).toBe('enterprise');
    expect(Trello.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('uses api_key_query auth with key and token params', () => {
    const authType = Trello.auth?.types[0];
    expect(authType).toEqual(
      expect.objectContaining({
        type: 'api_key_query',
        defaults: { paramNames: ['key', 'token'] },
      })
    );
  });

  it('retries on rate-limit status codes', () => {
    expect(Trello.policies?.retry).toEqual(
      expect.objectContaining({ retryOnStatusCodes: expect.arrayContaining([429, 503]) })
    );
  });

  it('exposes every action as a tool', () => {
    Object.values(Trello.actions).forEach((action) => {
      expect(action.isTool).toBe(true);
    });
  });

  it('does not expose a hard-delete action', () => {
    expect(Object.keys(Trello.actions)).not.toContain('deleteCard');
  });

  describe('whoAmI action', () => {
    it('fetches the current member', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'member1', username: 'jdoe' } });
      const result = await Trello.actions.whoAmI.handler(mockContext, {});
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/members/me`);
      expect(result).toEqual({ id: 'member1', username: 'jdoe' });
    });
  });

  describe('listBoardLabels action', () => {
    it('fetches labels for a board', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 'label1', name: 'Bug', color: 'red' }] });
      const result = await Trello.actions.listBoardLabels.handler(mockContext, {
        boardId: 'board1',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/boards/board1/labels`);
      expect(result).toEqual([{ id: 'label1', name: 'Bug', color: 'red' }]);
    });
  });

  describe('listBoardMembers action', () => {
    it('fetches members for a board', async () => {
      mockClient.get.mockResolvedValue({
        data: [{ id: 'member1', username: 'jdoe', fullName: 'Jane Doe' }],
      });
      const result = await Trello.actions.listBoardMembers.handler(mockContext, {
        boardId: 'board1',
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/boards/board1/members`);
      expect(result).toEqual([{ id: 'member1', username: 'jdoe', fullName: 'Jane Doe' }]);
    });
  });

  describe('getCard action', () => {
    it('fetches a card by ID', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 'card1', name: 'Fix bug' } });
      const result = await Trello.actions.getCard.handler(mockContext, { cardId: 'card1' });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/cards/card1`);
      expect(result).toEqual({ id: 'card1', name: 'Fix bug' });
    });
  });

  describe('search action', () => {
    it('applies default modelTypes and limits', async () => {
      mockClient.get.mockResolvedValue({ data: { cards: [], boards: [] } });
      await Trello.actions.search.handler(mockContext, { query: 'login bug' });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/search`, {
        params: {
          query: 'login bug',
          modelTypes: 'cards,boards',
          cards_limit: 10,
          boards_limit: 10,
        },
      });
    });

    it('passes through custom modelTypes, limits, and idBoards', async () => {
      mockClient.get.mockResolvedValue({ data: {} });
      await Trello.actions.search.handler(mockContext, {
        query: 'roadmap',
        modelTypes: 'boards',
        idBoards: 'board1,board2',
        cardsLimit: 5,
        boardsLimit: 20,
      });
      expect(mockClient.get).toHaveBeenCalledWith(`${BASE_URL}/search`, {
        params: {
          query: 'roadmap',
          modelTypes: 'boards',
          idBoards: 'board1,board2',
          cards_limit: 5,
          boards_limit: 20,
        },
      });
    });
  });

  describe('createCard action', () => {
    it('posts idList and name as form body, omitting unset optional fields', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'card1' } });
      await Trello.actions.createCard.handler(mockContext, {
        listId: 'list1',
        name: 'New card',
      });
      const [url, body] = mockClient.post.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/cards`);
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ idList: 'list1', name: 'New card' });
    });

    it('includes optional fields when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'card1' } });
      await Trello.actions.createCard.handler(mockContext, {
        listId: 'list1',
        name: 'New card',
        desc: 'Details',
        due: '2024-06-15T17:00:00.000Z',
        pos: 'top',
        idMembers: 'member1',
        idLabels: 'label1',
      });
      const [url, body] = mockClient.post.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/cards`);
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({
        idList: 'list1',
        name: 'New card',
        desc: 'Details',
        due: '2024-06-15T17:00:00.000Z',
        pos: 'top',
        idMembers: 'member1',
        idLabels: 'label1',
      });
    });
  });

  describe('updateCard action', () => {
    it('moves a card to another list via idList', async () => {
      mockClient.put.mockResolvedValue({ data: { id: 'card1', idList: 'list2' } });
      await Trello.actions.updateCard.handler(mockContext, {
        cardId: 'card1',
        idList: 'list2',
      });
      const [url, body] = mockClient.put.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/cards/card1`);
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ idList: 'list2' });
    });

    it('archives a card via closed: true', async () => {
      mockClient.put.mockResolvedValue({ data: { id: 'card1', closed: true } });
      await Trello.actions.updateCard.handler(mockContext, {
        cardId: 'card1',
        closed: true,
      });
      const [, body] = mockClient.put.mock.calls[0];
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ closed: 'true' });
    });

    it('sends the sentinel string "null" to clear the due date', async () => {
      mockClient.put.mockResolvedValue({ data: { id: 'card1', due: null } });
      await Trello.actions.updateCard.handler(mockContext, { cardId: 'card1', due: null });
      const [, body] = mockClient.put.mock.calls[0];
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ due: 'null' });
    });

    it('unarchives a card via closed: false', async () => {
      mockClient.put.mockResolvedValue({ data: { id: 'card1', closed: false } });
      await Trello.actions.updateCard.handler(mockContext, {
        cardId: 'card1',
        closed: false,
      });
      const [, body] = mockClient.put.mock.calls[0];
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ closed: 'false' });
    });

    it('updates member and label assignments', async () => {
      mockClient.put.mockResolvedValue({ data: { id: 'card1' } });
      await Trello.actions.updateCard.handler(mockContext, {
        cardId: 'card1',
        idMembers: 'member1,member2',
        idLabels: 'label1',
      });
      const [, body] = mockClient.put.mock.calls[0];
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({
        idMembers: 'member1,member2',
        idLabels: 'label1',
      });
    });
  });

  describe('addComment action', () => {
    it('posts a comment to the card as form body', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 'action1' } });
      await Trello.actions.addComment.handler(mockContext, {
        cardId: 'card1',
        text: 'Looks good to me',
      });
      const [url, body] = mockClient.post.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/cards/card1/actions/comments`);
      expect(body).toBeInstanceOf(URLSearchParams);
      expect(Object.fromEntries(body)).toEqual({ text: 'Looks good to me' });
    });
  });

  describe('test.handler', () => {
    if (!Trello.test) {
      throw new Error('Test handler not defined');
    }
    const testHandler = Trello.test.handler;

    it('returns ok: true with the connected username on success', async () => {
      mockClient.get.mockResolvedValue({ data: { username: 'jdoe' } });
      const result = await testHandler(mockContext);
      expect(result).toEqual(
        expect.objectContaining({ ok: true, message: expect.stringContaining('jdoe') })
      );
    });

    it('returns ok: false with an error message on failure', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid key'));
      const result = await testHandler(mockContext);
      expect(result).toEqual(
        expect.objectContaining({ ok: false, message: expect.stringContaining('Invalid key') })
      );
    });
  });
});
