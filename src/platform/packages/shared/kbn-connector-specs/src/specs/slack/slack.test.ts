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

  it('should use oauth_authorization_code auth type', () => {
    expect(Slack.auth).toBeDefined();
    expect(Slack.auth?.types).toHaveLength(1);
    expect((Slack.auth?.types[0] as { type: string }).type).toBe('oauth_authorization_code');
  });

  describe('listConversations action', () => {
    it('should list conversations with defaults', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channels: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Slack.actions.listConversations.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.list?'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional parameters', async () => {
      const mockResponse = {
        data: {
          ok: true,
          channels: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await Slack.actions.listConversations.handler(mockContext, {
        types: 'public_channel,private_channel,im,mpim',
        excludeArchived: true,
        limit: 200,
        cursor: 'cursor123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.list?types=public_channel%2Cprivate_channel%2Cim%2Cmpim&exclude_archived=true&limit=200&cursor=cursor123'
      );
    });

    it('should throw error when Slack API returns error', async () => {
      const mockResponse = {
        data: {
          ok: false,
          error: 'invalid_auth',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await expect(
        Slack.actions.listConversations.handler(mockContext, {})
      ).rejects.toThrow('Slack API error: invalid_auth');
    });
  });

  describe('getConversationHistory action', () => {
    it('should get conversation history with required channel', async () => {
      const mockResponse = {
        data: {
          ok: true,
          messages: [],
          has_more: false,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Slack.actions.getConversationHistory.handler(mockContext, {
        channel: 'C123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.history?channel=C123'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include optional parameters', async () => {
      const mockResponse = { data: { ok: true, messages: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Slack.actions.getConversationHistory.handler(mockContext, {
        channel: 'C123',
        oldest: '1700000000.000000',
        latest: '1700000100.000000',
        inclusive: true,
        limit: 100,
        cursor: 'cursor123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.history?channel=C123&oldest=1700000000.000000&latest=1700000100.000000&inclusive=true&limit=100&cursor=cursor123'
      );
    });

    it('should throw error when Slack API returns error', async () => {
      const mockResponse = { data: { ok: false, error: 'invalid_auth' } };
      mockClient.get.mockResolvedValue(mockResponse);

      await expect(
        Slack.actions.getConversationHistory.handler(mockContext, { channel: 'C123' })
      ).rejects.toThrow('Slack API error: invalid_auth');
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
      ).rejects.toThrow('Slack API error: channel_not_found');
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
      mockClient.post.mockResolvedValue(mockResponse);

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith('https://slack.com/api/auth.test');
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
      mockClient.post.mockResolvedValue(mockResponse);

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('invalid_auth');
    });

    it('should return failure on network error', async () => {
      mockClient.post.mockRejectedValue(new Error('Network timeout'));

      if (!Slack.test) {
        throw new Error('Test handler not defined');
      }
      const result = await Slack.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });
  });
});
