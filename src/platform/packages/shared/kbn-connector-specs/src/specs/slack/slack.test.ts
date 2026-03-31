/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Slack } from './slack';

describe('Slack', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Slack).toBeDefined();
  });

  it('should have correct metadata', () => {
    expect(Slack.metadata.id).toBe('.slack2');
    expect(Slack.metadata.displayName).toBe('Slack (v2)');
    expect(Slack.metadata.minimumLicense).toBe('enterprise');
    expect(Slack.metadata.supportedFeatureIds).toContain('workflows');
  });

  it('should use bearer auth type', () => {
    expect(Slack.auth).toBeDefined();
    expect(Slack.auth?.types.length).toBeGreaterThanOrEqual(1);
    const types = (Slack.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  describe('searchMessages action', () => {
    it('should search messages with required query', async () => {
      const mockResponse = {
        data: {
          ok: true,
          results: { messages: [] },
          response_metadata: { next_cursor: '' },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Slack.actions.searchMessages.handler(mockContext, { query: 'hello' });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/assistant.search.context',
        expect.objectContaining({
          query: 'hello',
          content_types: ['messages'],
        }),
        expect.any(Object)
      );
      expect(result).toEqual({
        ok: true,
        query: 'hello',
        total: 0,
        response_metadata: { next_cursor: '' },
        matches: [],
      });
    });

    it('should include optional parameters', async () => {
      const mockResponse = {
        data: {
          ok: true,
          results: { messages: [] },
          response_metadata: { next_cursor: '' },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await Slack.actions.searchMessages.handler(mockContext, {
        query: 'test',
        sort: 'timestamp',
        sortDir: 'desc',
        count: 20,
        cursor: 'abc',
        includeContextMessages: true,
        includeBots: false,
        includeMessageBlocks: true,
        inChannel: 'general',
        fromUser: '@U123',
        after: '2026-01-01',
        before: '2026-02-01',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/assistant.search.context',
        expect.objectContaining({
          query: 'test in:general from:@U123 after:2026-01-01 before:2026-02-01',
          sort: 'timestamp',
          sort_dir: 'desc',
          cursor: 'abc',
          include_context_messages: true,
          include_bots: false,
          include_message_blocks: true,
        }),
        expect.any(Object)
      );
    });

    it('should return raw Slack response when raw=true', async () => {
      const mockResponse = {
        data: {
          ok: true,
          results: { messages: [{ content: 'hi' }] },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Slack.actions.searchMessages.handler(mockContext, {
        query: 'hello',
        raw: true,
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when Slack API returns error', async () => {
      const mockResponse = { data: { ok: false, error: 'invalid_auth' } };
      mockClient.post.mockResolvedValue(mockResponse);

      await expect(
        Slack.actions.searchMessages.handler(mockContext, { query: 'test' })
      ).rejects.toThrow('Slack searchMessages error: invalid_auth');
    });
  });

  describe('resolveChannelId action', () => {
    it('should resolve a channel id by exact name match', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channels: [
            { id: 'C1', name: 'general', is_archived: false },
            { id: 'C2', name: 'random', is_archived: false },
          ],
          response_metadata: { next_cursor: 'next123' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Slack.actions.resolveChannelId.handler(mockContext, {
        name: '#general',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://slack.com/api/conversations.list', {
        params: {
          types: 'public_channel',
          exclude_archived: true,
          limit: 1000,
        },
      });
      expect(result).toEqual({
        ok: true,
        found: true,
        id: 'C1',
        name: 'general',
        source: 'conversations.list',
        pagesFetched: 1,
        nextCursor: 'next123',
      });
    });

    it('should paginate until found (contains match)', async () => {
      mockClient.get
        .mockResolvedValueOnce({
          data: {
            ok: true,
            channels: [{ id: 'C9', name: 'zzz' }],
            response_metadata: { next_cursor: 'c2' },
          },
        })
        .mockResolvedValueOnce({
          data: {
            ok: true,
            channels: [{ id: 'C7', name: 'alerts-prod' }],
            response_metadata: { next_cursor: '' },
          },
        });

      const result = await Slack.actions.resolveChannelId.handler(mockContext, {
        name: 'alerts',
        match: 'contains',
        maxPages: 5,
      });

      expect(mockClient.get).toHaveBeenCalledTimes(2);
      expect(mockClient.get).toHaveBeenNthCalledWith(
        1,
        'https://slack.com/api/conversations.list',
        {
          params: { types: 'public_channel', exclude_archived: true, limit: 1000 },
        }
      );
      expect(mockClient.get).toHaveBeenNthCalledWith(
        2,
        'https://slack.com/api/conversations.list',
        {
          params: { types: 'public_channel', exclude_archived: true, limit: 1000, cursor: 'c2' },
        }
      );
      expect(result).toMatchObject({
        ok: true,
        found: true,
        id: 'C7',
        source: 'conversations.list',
        pagesFetched: 2,
      });
    });
  });

  describe('sendMessage action', () => {
    it('should send message with required parameters', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channel: 'C123',
          ts: '1234567890.123456',
          message: {
            text: 'Hello from Kibana',
            user: 'U123',
            type: 'message',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Slack.actions.sendMessage.handler(mockContext, {
        channel: 'C123',
        text: 'Hello from Kibana',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel: 'C123',
          text: 'Hello from Kibana',
        },
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should send threaded reply', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channel: 'C123',
          ts: '1234567890.123457',
          message: {
            text: 'Reply message',
            thread_ts: '1234567890.123456',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await Slack.actions.sendMessage.handler(mockContext, {
        channel: 'C123',
        text: 'Reply message',
        threadTs: '1234567890.123456',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel: 'C123',
          text: 'Reply message',
          thread_ts: '1234567890.123456',
        },
        expect.any(Object)
      );
    });

    it('should include unfurl options', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channel: 'C123',
          ts: '1234567890.123456',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await Slack.actions.sendMessage.handler(mockContext, {
        channel: 'C123',
        text: 'Check out https://example.com',
        unfurlLinks: true,
        unfurlMedia: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        {
          channel: 'C123',
          text: 'Check out https://example.com',
          unfurl_links: true,
          unfurl_media: false,
        },
        expect.any(Object)
      );
    });

    it('should throw error when Slack API returns error', async () => {
      const mockResponse = {
        data: {
          ok: false,
          error: 'channel_not_found',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await expect(
        Slack.actions.sendMessage.handler(mockContext, {
          channel: 'invalid-channel',
          text: 'Hello',
        })
      ).rejects.toThrow('Slack sendMessage error: channel_not_found');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          ok: true,
          url: 'https://myteam.slack.com/',
          team: 'My Team',
          user: 'testbot',
          team_id: 'T123',
          user_id: 'U123',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://slack.com/api/auth.test');
      expect(result.ok).toBe(true);
      expect(result.message).toContain('My Team');
    });

    it('should return failure when Slack API returns error', async () => {
      const mockResponse = {
        data: {
          ok: false,
          error: 'invalid_auth',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('invalid_auth');
    });

    it('should return failure on network error', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });
  });
});
