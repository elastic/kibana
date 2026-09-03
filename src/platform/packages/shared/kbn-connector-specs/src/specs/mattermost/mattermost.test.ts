/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { ActionContext } from '../../connector_spec';
import { Mattermost } from './mattermost';
import {
  CreatePostInputSchema,
  GetThreadInputSchema,
  ListPostsInputSchema,
  MattermostConfigSchema,
  SearchPostsInputSchema,
} from './types';

const BASE_URL = 'https://chat.example.com';
const CURRENT_USER_ID = 'currentuser000000000000000';
const OTHER_USER_ID = 'otheruser00000000000000000';
const TEAM_ID = 'team0000000000000000000000';
const CHANNEL_ID = 'channel00000000000000000000';
const POST_ID = 'post0000000000000000000000';
const ROOT_POST_ID = 'root0000000000000000000000';
const FILE_ID = 'file0000000000000000000000';

const rawUser = {
  id: CURRENT_USER_ID,
  username: 'elastic-bot',
  email: 'elastic-bot@example.com',
  first_name: 'Elastic',
  last_name: 'Bot',
  nickname: 'workflow bot',
  create_at: 1,
  update_at: 2,
  delete_at: 0,
  roles: 'system_user',
  auth_data: 'must-not-leak',
  password: 'must-not-leak',
};

const rawTeam = {
  id: TEAM_ID,
  display_name: 'Security',
  name: 'security',
  description: 'Security operations',
  email: 'security@example.com',
  type: 'O',
  create_at: 3,
  update_at: 4,
  delete_at: 0,
  invite_id: 'must-not-leak',
};

const rawChannel = {
  id: CHANNEL_ID,
  team_id: TEAM_ID,
  type: 'O',
  display_name: 'Incidents',
  name: 'incidents',
  header: 'Coordinate incidents',
  purpose: 'Incident response',
  last_post_at: 8,
  total_msg_count: 10,
  create_at: 5,
  update_at: 6,
  delete_at: 0,
  creator_id: 'must-not-leak',
};

const rawPost = {
  id: POST_ID,
  create_at: 11,
  update_at: 12,
  delete_at: 0,
  edit_at: 0,
  user_id: CURRENT_USER_ID,
  channel_id: CHANNEL_ID,
  root_id: '',
  original_id: '',
  message: 'Investigating the alert',
  type: '',
  file_ids: [FILE_ID],
  reply_count: 2,
  props: { secret: 'must-not-leak' },
  metadata: { embeds: [{ url: 'must-not-leak' }] },
};

const rawPostList = {
  order: [POST_ID],
  posts: { [POST_ID]: rawPost },
  next_post_id: 'next0000000000000000000000',
  prev_post_id: 'prev0000000000000000000000',
  has_next: true,
};

const rawThreadPostList = {
  ...rawPostList,
  next_post_id: '',
  prev_post_id: '',
};

describe('Mattermost connector', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockClient = { get: mockGet, post: mockPost } as unknown as jest.Mocked<AxiosInstance>;
  const mockContext = {
    client: mockClient,
    config: { serverUrl: BASE_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata and configuration', () => {
    it('has the expected metadata and supported features', () => {
      expect(Mattermost.metadata).toMatchObject({
        id: '.mattermost',
        displayName: 'Mattermost',
        minimumLicense: 'enterprise',
        isTechnicalPreview: true,
        supportedFeatureIds: ['workflows', 'agentBuilder'],
      });
    });

    it('uses bearer authentication for the bot token', () => {
      expect(Mattermost.auth?.types).toHaveLength(1);
      expect(Mattermost.auth?.types[0]).toMatchObject({ type: 'bearer', isRecommended: true });
    });

    it('documents conditional write permissions and message-priority requirements', () => {
      const auth = JSON.stringify(Mattermost.auth);
      const createDirectChannel = Mattermost.actions.createDirectChannel.description;
      const createPost = Mattermost.actions.createPost.description;

      expect(auth).toContain('create_post');
      expect(auth).toContain('create_direct_channel');
      expect(auth).toContain('upload_file');
      expect(createDirectChannel).toContain('create_direct_channel');
      expect(createPost).toContain('create_post');
      expect(createPost).toContain('upload_file');
      expect(createPost).toContain('PostPriority');
      expect(createPost).toContain('Professional or Enterprise');
    });

    it('validates an HTTP or HTTPS Mattermost Site URL with an optional subpath', () => {
      expect(MattermostConfigSchema.safeParse({ serverUrl: BASE_URL }).success).toBe(true);
      expect(
        MattermostConfigSchema.safeParse({ serverUrl: 'http://mattermost.internal:8065' }).success
      ).toBe(true);
      expect(
        MattermostConfigSchema.safeParse({ serverUrl: 'ftp://chat.example.com' }).success
      ).toBe(false);
      expect(
        MattermostConfigSchema.safeParse({ serverUrl: 'https://user:pass@chat.example.com' })
          .success
      ).toBe(false);
      expect(
        MattermostConfigSchema.safeParse({
          serverUrl: 'https://chat.example.com/company/mattermost',
        }).success
      ).toBe(true);
      expect(
        MattermostConfigSchema.safeParse({ serverUrl: 'https://chat.example.com/api/v4' }).success
      ).toBe(false);
    });

    it.each(['not a url', '', '://', 'http://'])(
      'rejects malformed server URL %p without throwing',
      (serverUrl) => {
        expect(() => MattermostConfigSchema.safeParse({ serverUrl })).not.toThrow();
        expect(MattermostConfigSchema.safeParse({ serverUrl }).success).toBe(false);
      }
    );

    it('marks the server URL for allowedHosts validation', () => {
      const { shape } = Mattermost.schema as unknown as {
        shape: Record<string, { meta: () => { validate?: unknown } | undefined }>;
      };
      expect(shape.serverUrl.meta()?.validate).toEqual({ allowedHosts: true });
      expect(Mattermost.validateUrls).toEqual({ fields: ['serverUrl'] });
    });

    it('exposes read actions as tools and keeps write actions workflow-only', () => {
      expect(Mattermost.actions.listTeams).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.listChannels).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.findUserByEmail).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.listPosts).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.getThread).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.searchPosts).toMatchObject({ isTool: true, scope: 'read' });
      expect(Mattermost.actions.createDirectChannel).toMatchObject({
        isTool: false,
        scope: 'write',
      });
      expect(Mattermost.actions.createPost).toMatchObject({ isTool: false, scope: 'write' });
    });
  });

  describe('input bounds', () => {
    it('limits posts to the ten file IDs allowed by Mattermost', () => {
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'message',
          fileIds: Array.from({ length: 10 }, (_, index) => `${index}`.padEnd(26, 'a')),
        }).success
      ).toBe(true);
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'message',
          fileIds: Array.from({ length: 11 }, (_, index) => `${index}`.padEnd(26, 'a')),
        }).success
      ).toBe(false);
    });

    it('rejects priority metadata on thread replies', () => {
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'reply',
          rootId: ROOT_POST_ID,
          priority: { priority: 'important', requestedAck: false },
        }).success
      ).toBe(false);
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'root post',
          priority: { priority: 'important', requestedAck: false },
        }).success
      ).toBe(true);
    });

    it('rejects non-JSON props without throwing', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const unsupportedProps = [
        { value: BigInt(1) },
        cyclic,
        { callback: () => undefined },
        { missing: undefined },
        { notANumber: Number.NaN },
      ];

      for (const props of unsupportedProps) {
        const parse = () =>
          CreatePostInputSchema.safeParse({
            channelId: CHANNEL_ID,
            message: 'message',
            props,
          });
        expect(parse).not.toThrow();
        expect(parse().success).toBe(false);
      }
    });

    it('accepts bounded nested JSON props and rejects an oversized object', () => {
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'message',
          props: { nested: ['value', 4, true, null] },
        }).success
      ).toBe(true);
      expect(
        CreatePostInputSchema.safeParse({
          channelId: CHANNEL_ID,
          message: 'message',
          props: { value: 'x'.repeat(20_000) },
        }).success
      ).toBe(false);
    });

    it('rejects page parameters when since is supplied', () => {
      expect(
        ListPostsInputSchema.safeParse({ channelId: CHANNEL_ID, since: 1735689600000 }).success
      ).toBe(true);
      expect(
        ListPostsInputSchema.safeParse({
          channelId: CHANNEL_ID,
          since: 1735689600000,
          page: 1,
        }).success
      ).toBe(false);
      expect(
        ListPostsInputSchema.safeParse({
          channelId: CHANNEL_ID,
          since: 1735689600000,
          perPage: 100,
        }).success
      ).toBe(false);
      expect(
        ListPostsInputSchema.safeParse({
          channelId: CHANNEL_ID,
          since: 1735689600000,
          before: POST_ID,
        }).success
      ).toBe(false);
      expect(
        ListPostsInputSchema.safeParse({
          channelId: CHANNEL_ID,
          before: POST_ID,
          after: ROOT_POST_ID,
        }).success
      ).toBe(false);
    });

    it('bounds list and search page sizes at the Mattermost maximum of 200', () => {
      expect(ListPostsInputSchema.safeParse({ channelId: CHANNEL_ID, perPage: 200 }).success).toBe(
        true
      );
      expect(ListPostsInputSchema.safeParse({ channelId: CHANNEL_ID, perPage: 201 }).success).toBe(
        false
      );
      expect(
        SearchPostsInputSchema.safeParse({ teamId: TEAM_ID, terms: 'alert', perPage: 201 }).success
      ).toBe(false);
    });

    it('bounds thread pages and requires a creation timestamp with a post cursor', () => {
      expect(GetThreadInputSchema.safeParse({ postId: POST_ID, perPage: 200 }).success).toBe(true);
      expect(GetThreadInputSchema.safeParse({ postId: POST_ID, perPage: 201 }).success).toBe(false);
      expect(
        GetThreadInputSchema.safeParse({ postId: POST_ID, fromPost: ROOT_POST_ID }).success
      ).toBe(false);
      expect(GetThreadInputSchema.safeParse({ postId: POST_ID, direction: 'down' }).success).toBe(
        true
      );
      expect(GetThreadInputSchema.parse({ postId: POST_ID }).direction).toBe('down');
      expect(
        GetThreadInputSchema.safeParse({
          postId: POST_ID,
          fromPost: ROOT_POST_ID,
          fromCreateAt: 1735689600000,
        }).success
      ).toBe(true);
      expect(
        GetThreadInputSchema.safeParse({
          postId: POST_ID,
          fromCreateAt: Number.MAX_SAFE_INTEGER + 1,
        }).success
      ).toBe(false);
    });
  });

  describe('listTeams', () => {
    it('resolves the current user GUID before requesting teams and trims output', async () => {
      mockGet.mockResolvedValueOnce({ data: rawUser }).mockResolvedValueOnce({ data: [rawTeam] });

      const result = await Mattermost.actions.listTeams.handler(mockContext, {});

      expect(mockGet).toHaveBeenNthCalledWith(1, `${BASE_URL}/api/v4/users/me`);
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/api/v4/users/${CURRENT_USER_ID}/teams`
      );
      expect(result).toEqual({
        teams: [
          {
            id: TEAM_ID,
            displayName: 'Security',
            name: 'security',
            description: 'Security operations',
            type: 'O',
            createAt: 3,
            updateAt: 4,
            deleteAt: 0,
          },
        ],
      });
    });

    it('bounds selected text fields returned by the Mattermost server', async () => {
      mockGet
        .mockResolvedValueOnce({ data: rawUser })
        .mockResolvedValueOnce({ data: [{ ...rawTeam, description: 'x'.repeat(5000) }] });

      const result = await Mattermost.actions.listTeams.handler(mockContext, {});

      expect(result.teams[0].description).toHaveLength(4096);
    });

    it('rejects a non-array successful teams response', async () => {
      mockGet
        .mockResolvedValueOnce({ data: rawUser })
        .mockResolvedValueOnce({ data: { teams: [rawTeam] }, status: 200 });

      await expect(Mattermost.actions.listTeams.handler(mockContext, {})).rejects.toThrow(
        'Mattermost listTeams failed: expected an array response'
      );
    });
  });

  describe('listChannels', () => {
    it('uses the resolved current user GUID and encodes the team ID', async () => {
      const teamId = 'team/id';
      mockGet
        .mockResolvedValueOnce({ data: rawUser })
        .mockResolvedValueOnce({ data: [rawChannel] });

      const result = await Mattermost.actions.listChannels.handler(mockContext, { teamId });

      expect(mockGet).toHaveBeenNthCalledWith(1, `${BASE_URL}/api/v4/users/me`);
      expect(mockGet).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/api/v4/users/${CURRENT_USER_ID}/teams/team%2Fid/channels`
      );
      expect(result).toEqual({
        channels: [
          {
            id: CHANNEL_ID,
            teamId: TEAM_ID,
            type: 'O',
            displayName: 'Incidents',
            name: 'incidents',
            header: 'Coordinate incidents',
            purpose: 'Incident response',
            lastPostAt: 8,
            totalMessageCount: 10,
            createAt: 5,
            updateAt: 6,
            deleteAt: 0,
          },
        ],
      });
    });

    it('rejects a non-array successful channels response', async () => {
      mockGet
        .mockResolvedValueOnce({ data: rawUser })
        .mockResolvedValueOnce({ data: { channels: [rawChannel] }, status: 200 });

      await expect(
        Mattermost.actions.listChannels.handler(mockContext, { teamId: TEAM_ID })
      ).rejects.toThrow('Mattermost listChannels failed: expected an array response');
    });
  });

  describe('findUserByEmail', () => {
    it('encodes the email path segment once and removes sensitive profile fields', async () => {
      mockGet.mockResolvedValue({ data: rawUser });

      const result = await Mattermost.actions.findUserByEmail.handler(mockContext, {
        email: 'analyst+soc@example.com',
      });

      expect(mockGet).toHaveBeenCalledWith(
        `${BASE_URL}/api/v4/users/email/analyst%2Bsoc%40example.com`
      );
      expect(result).toEqual({
        user: {
          id: CURRENT_USER_ID,
          username: 'elastic-bot',
          email: 'elastic-bot@example.com',
          firstName: 'Elastic',
          lastName: 'Bot',
          nickname: 'workflow bot',
          createAt: 1,
          updateAt: 2,
          deleteAt: 0,
        },
      });
    });

    it('rejects a successful user response without an ID', async () => {
      mockGet.mockResolvedValue({ data: { username: 'missing-id' }, status: 200 });

      await expect(
        Mattermost.actions.findUserByEmail.handler(mockContext, {
          email: 'analyst@example.com',
        })
      ).rejects.toThrow('Mattermost findUserByEmail failed: response did not include a user ID');
    });
  });

  describe('createDirectChannel', () => {
    it('posts a bare two-ID array containing the current and other users', async () => {
      mockGet.mockResolvedValue({ data: rawUser });
      mockPost.mockResolvedValue({ data: { ...rawChannel, type: 'D', team_id: '' }, status: 201 });

      const result = await Mattermost.actions.createDirectChannel.handler(mockContext, {
        userId: OTHER_USER_ID,
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/users/me`);
      expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/direct`, [
        CURRENT_USER_ID,
        OTHER_USER_ID,
      ]);
      expect(result).toEqual({
        channel: expect.objectContaining({ id: CHANNEL_ID, type: 'D' }),
      });
    });

    it('rejects a successful direct-channel response without an ID', async () => {
      mockGet.mockResolvedValue({ data: rawUser });
      mockPost.mockResolvedValue({ data: { type: 'D' }, status: 201 });

      await expect(
        Mattermost.actions.createDirectChannel.handler(mockContext, { userId: OTHER_USER_ID })
      ).rejects.toThrow(
        'Mattermost createDirectChannel failed: response did not include a channel ID'
      );
    });
  });

  describe('createPost', () => {
    it('sends required and optional fields with Mattermost wire names', async () => {
      const responseFileIds = Array.from({ length: 11 }, (_, index) => `${index}`.padEnd(26, 'f'));
      mockPost.mockResolvedValue({
        data: { ...rawPost, file_ids: responseFileIds },
        status: 201,
      });

      const result = await Mattermost.actions.createPost.handler(mockContext, {
        channelId: CHANNEL_ID,
        message: 'Investigating the alert',
        rootId: ROOT_POST_ID,
        fileIds: [FILE_ID],
        props: { source: 'elastic', severity: 4, acknowledged: false },
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts`, {
        channel_id: CHANNEL_ID,
        message: 'Investigating the alert',
        root_id: ROOT_POST_ID,
        file_ids: [FILE_ID],
        props: { source: 'elastic', severity: 4, acknowledged: false },
      });
      expect(result).toEqual({
        post: {
          id: POST_ID,
          createAt: 11,
          updateAt: 12,
          deleteAt: 0,
          editAt: 0,
          userId: CURRENT_USER_ID,
          channelId: CHANNEL_ID,
          rootId: '',
          originalId: '',
          message: 'Investigating the alert',
          type: '',
          fileIds: responseFileIds.slice(0, 10),
          replyCount: 2,
        },
      });
    });

    it('sends priority metadata only on a root post and preserves false', async () => {
      mockPost.mockResolvedValue({ data: rawPost, status: 201 });

      await Mattermost.actions.createPost.handler(mockContext, {
        channelId: CHANNEL_ID,
        message: 'Investigating the alert',
        priority: { priority: 'urgent', requestedAck: false },
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts`, {
        channel_id: CHANNEL_ID,
        message: 'Investigating the alert',
        metadata: {
          priority: {
            priority: 'urgent',
            requested_ack: false,
          },
        },
      });
    });

    it('omits optional fields rather than sending undefined values', async () => {
      mockPost.mockResolvedValue({ data: rawPost, status: 201 });

      await Mattermost.actions.createPost.handler(mockContext, {
        channelId: CHANNEL_ID,
        message: 'Investigating',
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts`, {
        channel_id: CHANNEL_ID,
        message: 'Investigating',
      });
    });

    it('rejects a successful post response without an ID', async () => {
      mockPost.mockResolvedValue({ data: { message: 'missing id' }, status: 201 });

      await expect(
        Mattermost.actions.createPost.handler(mockContext, {
          channelId: CHANNEL_ID,
          message: 'Investigating',
        })
      ).rejects.toThrow('Mattermost createPost failed: response did not include a post ID');
    });
  });

  describe('listPosts', () => {
    it('sends bounded page parameters and normalizes the PostList map', async () => {
      mockGet.mockResolvedValue({ data: rawPostList });

      const result = await Mattermost.actions.listPosts.handler(mockContext, {
        channelId: CHANNEL_ID,
        page: 2,
        perPage: 100,
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/${CHANNEL_ID}/posts`, {
        params: { page: 2, per_page: 100 },
      });
      expect(result).toEqual({
        posts: [expect.objectContaining({ id: POST_ID, message: 'Investigating the alert' })],
        nextPostId: 'next0000000000000000000000',
        previousPostId: 'prev0000000000000000000000',
        hasNext: true,
      });
    });

    it('sends only since when since is provided', async () => {
      mockGet.mockResolvedValue({ data: rawPostList });

      await Mattermost.actions.listPosts.handler(mockContext, {
        channelId: CHANNEL_ID,
        since: 1735689600000,
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/${CHANNEL_ID}/posts`, {
        params: { since: 1735689600000 },
      });
    });

    it('uses Mattermost page defaults when no paging input is supplied', async () => {
      mockGet.mockResolvedValue({ data: rawPostList });

      await Mattermost.actions.listPosts.handler(mockContext, { channelId: CHANNEL_ID });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/${CHANNEL_ID}/posts`, {
        params: { page: 0, per_page: 60 },
      });
    });

    it('sends a before cursor and only explicitly requested paging fields', async () => {
      mockGet.mockResolvedValue({ data: rawPostList });

      await Mattermost.actions.listPosts.handler(mockContext, {
        channelId: CHANNEL_ID,
        before: POST_ID,
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/${CHANNEL_ID}/posts`, {
        params: { before: POST_ID },
      });
    });

    it('sends an after cursor with explicit bounded paging fields', async () => {
      mockGet.mockResolvedValue({ data: rawPostList });

      await Mattermost.actions.listPosts.handler(mockContext, {
        channelId: CHANNEL_ID,
        after: POST_ID,
        page: 1,
        perPage: 20,
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/channels/${CHANNEL_ID}/posts`, {
        params: { after: POST_ID, page: 1, per_page: 20 },
      });
    });

    it('rejects a malformed successful PostList response', async () => {
      mockGet.mockResolvedValue({ data: { order: [], posts: [] }, status: 200 });

      await expect(
        Mattermost.actions.listPosts.handler(mockContext, {
          channelId: CHANNEL_ID,
          page: 0,
          perPage: 60,
        })
      ).rejects.toThrow('Mattermost listPosts failed: malformed PostList response');
    });
  });

  describe('getThread', () => {
    it('uses bounded camelCase pagination options and encodes the post ID', async () => {
      mockGet.mockResolvedValue({ data: rawThreadPostList });

      const result = await Mattermost.actions.getThread.handler(mockContext, {
        postId: 'post/id',
        perPage: 100,
        fromPost: ROOT_POST_ID,
        fromCreateAt: 1735689600000,
        direction: 'down',
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts/post%2Fid/thread`, {
        params: {
          perPage: 100,
          fromPost: ROOT_POST_ID,
          fromCreateAt: 1735689600000,
          direction: 'down',
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          posts: [expect.objectContaining({ id: POST_ID })],
          nextPostId: '',
          previousPostId: '',
          hasNext: true,
        })
      );
    });

    it('uses a finite default thread page size', async () => {
      mockGet.mockResolvedValue({ data: rawThreadPostList });
      const input = GetThreadInputSchema.parse({ postId: POST_ID });

      await Mattermost.actions.getThread.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts/${POST_ID}/thread`, {
        params: { perPage: 60, direction: 'down' },
      });
    });

    it('allows a thread direction without cursor fields', async () => {
      mockGet.mockResolvedValue({ data: rawThreadPostList });

      await Mattermost.actions.getThread.handler(mockContext, {
        postId: POST_ID,
        perPage: 20,
        direction: 'down',
      });

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/posts/${POST_ID}/thread`, {
        params: { perPage: 20, direction: 'down' },
      });
    });

    it('preserves the inaccessible-post time on an empty successful response', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          order: [],
          posts: {},
          next_post_id: '',
          prev_post_id: '',
          has_next: false,
          first_inaccessible_post_time: 1735689600000,
        },
      });

      const result = await Mattermost.actions.getThread.handler(
        mockContext,
        GetThreadInputSchema.parse({ postId: POST_ID })
      );

      expect(result).toEqual({
        posts: [],
        nextPostId: '',
        previousPostId: '',
        hasNext: false,
        firstInaccessiblePostTime: 1735689600000,
      });
    });

    it('accepts the first-inaccessible-post-time-only thread sentinel', async () => {
      mockGet.mockResolvedValue({
        status: 200,
        data: { first_inaccessible_post_time: 1735689600000 },
      });

      const result = await Mattermost.actions.getThread.handler(
        mockContext,
        GetThreadInputSchema.parse({ postId: POST_ID })
      );

      expect(result).toEqual({
        posts: [],
        firstInaccessiblePostTime: 1735689600000,
      });
    });

    it('rejects a malformed successful thread PostList response', async () => {
      mockGet.mockResolvedValue({ data: { order: 'not-an-array', posts: {} }, status: 200 });

      await expect(
        Mattermost.actions.getThread.handler(
          mockContext,
          GetThreadInputSchema.parse({ postId: POST_ID })
        )
      ).rejects.toThrow('Mattermost getThread failed: malformed PostList response');
    });
  });

  describe('searchPosts', () => {
    it('preserves false is_or_search and sends bounded search paging', async () => {
      mockPost.mockResolvedValue({
        data: { ...rawPostList, matches: { [POST_ID]: ['alert'] } },
      });

      const result = await Mattermost.actions.searchPosts.handler(mockContext, {
        teamId: TEAM_ID,
        terms: 'alert in:incidents',
        isOrSearch: false,
        page: 1,
        perPage: 50,
      });

      expect(mockPost).toHaveBeenCalledWith(`${BASE_URL}/api/v4/teams/${TEAM_ID}/posts/search`, {
        terms: 'alert in:incidents',
        is_or_search: false,
        page: 1,
        per_page: 50,
      });
      expect(result).toEqual(
        expect.objectContaining({
          posts: [expect.objectContaining({ id: POST_ID })],
          matches: { [POST_ID]: ['alert'] },
        })
      );
    });

    it('rejects a malformed successful search PostList response', async () => {
      mockPost.mockResolvedValue({ data: [], status: 200 });

      await expect(
        Mattermost.actions.searchPosts.handler(
          mockContext,
          SearchPostsInputSchema.parse({ teamId: TEAM_ID, terms: 'alert' })
        )
      ).rejects.toThrow('Mattermost searchPosts failed: malformed PostList response');
    });
  });

  describe('errors and health test', () => {
    it('surfaces bounded Mattermost error details without dumping arbitrary payload fields', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 401,
          data: {
            id: 'api.context.session_expired.app_error',
            message: 'Invalid or expired session',
            request_id: 'request-123',
            sensitive: 'must-not-leak',
          },
        },
      });

      await expect(
        Mattermost.actions.findUserByEmail.handler(mockContext, { email: 'a@b.co' })
      ).rejects.toThrow(
        'Mattermost findUserByEmail failed (status 401): Invalid or expired session [api.context.session_expired.app_error] (request id: request-123)'
      );
    });

    it('tests the connector with GET /api/v4/users/me', async () => {
      mockGet.mockResolvedValue({ data: rawUser });

      const result = await Mattermost.test?.handler(mockContext);

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/users/me`);
      expect(result).toEqual({ message: 'Connected to Mattermost as elastic-bot.' });
      expect(result).not.toHaveProperty('ok');
    });

    it('strips trailing slashes from the configured server URL', async () => {
      mockGet.mockResolvedValue({ data: rawUser });
      const context = {
        ...mockContext,
        config: { serverUrl: `${BASE_URL}///` },
      } as unknown as ActionContext;

      await Mattermost.test?.handler(context);

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/api/v4/users/me`);
    });

    it('preserves a Mattermost Site URL deployment subpath', async () => {
      mockGet.mockResolvedValue({ data: rawUser });
      const context = {
        ...mockContext,
        config: { serverUrl: `${BASE_URL}/company/mattermost/` },
      } as unknown as ActionContext;

      await Mattermost.test?.handler(context);

      expect(mockGet).toHaveBeenCalledWith(`${BASE_URL}/company/mattermost/api/v4/users/me`);
    });
  });
});
