/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  CreateDirectChannelInputSchema,
  CreatePostInputSchema,
  EmptyInputSchema,
  FindUserByEmailInputSchema,
  GetThreadInputSchema,
  ListChannelsInputSchema,
  ListPostsInputSchema,
  MattermostConfigSchema,
  SearchPostsInputSchema,
} from './types';
import type {
  CreateDirectChannelInput,
  CreatePostInput,
  FindUserByEmailInput,
  GetThreadInput,
  ListChannelsInput,
  ListPostsInput,
  MattermostConfig,
  SearchPostsInput,
} from './types';

const DEFAULT_PER_PAGE = 60;
const MAX_LIST_ITEMS = 1000;
const MAX_ERROR_DETAIL_LENGTH = 1000;
const MAX_MATCHES_PER_POST = 50;
const MAX_MATCH_LENGTH = 2000;
const MAX_SELECTED_TEXT_LENGTH = 4096;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, maxLength = MAX_SELECTED_TEXT_LENGTH): string | undefined =>
  typeof value === 'string' ? value.slice(0, maxLength) : undefined;

const numberValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const integerValue = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;

const booleanValue = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const getBaseUrl = (ctx: ActionContext): string => {
  const { serverUrl } = ctx.config as Partial<MattermostConfig>;
  if (!serverUrl) {
    throw new Error('Mattermost connector is missing the required server URL configuration');
  }
  return serverUrl.replace(/\/+$/, '');
};

const formatMattermostError = (action: string, error: unknown): Error => {
  const axiosError = error as AxiosError<unknown>;
  const data = isRecord(axiosError.response?.data) ? axiosError.response.data : undefined;
  const detail =
    stringValue(data?.message, MAX_ERROR_DETAIL_LENGTH) ??
    stringValue(axiosError.message, MAX_ERROR_DETAIL_LENGTH) ??
    'Unknown API error';
  const errorId = stringValue(data?.id, 200);
  const responseHeaders = axiosError.response?.headers as UnknownRecord | undefined;
  const requestId =
    stringValue(data?.request_id, 200) ?? stringValue(responseHeaders?.['x-request-id'], 200);
  const status = axiosError.response?.status ?? 'unknown';
  const errorIdSuffix = errorId ? ` [${errorId}]` : '';
  const requestIdSuffix = requestId ? ` (request id: ${requestId})` : '';
  return new Error(
    `Mattermost ${action} failed (status ${status}): ${detail}${errorIdSuffix}${requestIdSuffix}`
  );
};

const request = async <T>(action: string, fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw formatMattermostError(action, error);
  }
};

const trimUser = (value: unknown) => {
  const user = isRecord(value) ? value : {};
  return {
    id: stringValue(user.id),
    username: stringValue(user.username),
    email: stringValue(user.email),
    firstName: stringValue(user.first_name),
    lastName: stringValue(user.last_name),
    nickname: stringValue(user.nickname),
    createAt: numberValue(user.create_at),
    updateAt: numberValue(user.update_at),
    deleteAt: numberValue(user.delete_at),
  };
};

const trimTeam = (value: unknown) => {
  const team = isRecord(value) ? value : {};
  return {
    id: stringValue(team.id),
    displayName: stringValue(team.display_name),
    name: stringValue(team.name),
    description: stringValue(team.description),
    type: stringValue(team.type),
    createAt: numberValue(team.create_at),
    updateAt: numberValue(team.update_at),
    deleteAt: numberValue(team.delete_at),
  };
};

const trimChannel = (value: unknown) => {
  const channel = isRecord(value) ? value : {};
  return {
    id: stringValue(channel.id),
    teamId: stringValue(channel.team_id),
    type: stringValue(channel.type),
    displayName: stringValue(channel.display_name),
    name: stringValue(channel.name),
    header: stringValue(channel.header),
    purpose: stringValue(channel.purpose),
    lastPostAt: numberValue(channel.last_post_at),
    totalMessageCount: numberValue(channel.total_msg_count),
    createAt: numberValue(channel.create_at),
    updateAt: numberValue(channel.update_at),
    deleteAt: numberValue(channel.delete_at),
  };
};

const trimPost = (value: unknown) => {
  const post = isRecord(value) ? value : {};
  return {
    id: stringValue(post.id),
    createAt: numberValue(post.create_at),
    updateAt: numberValue(post.update_at),
    deleteAt: numberValue(post.delete_at),
    editAt: numberValue(post.edit_at),
    userId: stringValue(post.user_id),
    channelId: stringValue(post.channel_id),
    rootId: stringValue(post.root_id),
    originalId: stringValue(post.original_id),
    message: stringValue(post.message, 16_383),
    type: stringValue(post.type, 200),
    fileIds: Array.isArray(post.file_ids)
      ? post.file_ids
          .slice(0, 10)
          .map((fileId) => stringValue(fileId, 200))
          .filter((fileId): fileId is string => fileId !== undefined)
      : undefined,
    replyCount: numberValue(post.reply_count),
  };
};

const malformedPostList = (action: string): never => {
  throw new Error(`Mattermost ${action} failed: malformed PostList response`);
};

interface TrimPostListOptions {
  includeMatches?: boolean;
  allowInaccessibleSentinel?: boolean;
}

const trimPostList = (
  value: unknown,
  action: string,
  { includeMatches = false, allowInaccessibleSentinel = false }: TrimPostListOptions = {}
) => {
  if (!isRecord(value)) {
    return malformedPostList(action);
  }

  const firstInaccessiblePostTime = integerValue(value.first_inaccessible_post_time);
  if (value.first_inaccessible_post_time !== undefined && firstInaccessiblePostTime === undefined) {
    return malformedPostList(action);
  }

  if (value.order === undefined && value.posts === undefined) {
    if (allowInaccessibleSentinel && firstInaccessiblePostTime !== undefined) {
      return { posts: [], firstInaccessiblePostTime };
    }
    return malformedPostList(action);
  }

  if (!Array.isArray(value.order) || !isRecord(value.posts)) {
    return malformedPostList(action);
  }

  const sourceOrder = value.order;
  const postMap = value.posts;
  const order = sourceOrder.slice(0, MAX_LIST_ITEMS).map((postId) => {
    if (typeof postId !== 'string' || postId.length === 0 || postId.length > 200) {
      return malformedPostList(action);
    }
    return postId;
  });
  const posts = order.map((postId) => {
    const sourcePost = postMap[postId];
    if (!isRecord(sourcePost)) {
      return malformedPostList(action);
    }
    const post = trimPost(sourcePost);
    if (!post.id || post.id !== postId) {
      return malformedPostList(action);
    }
    return post;
  });

  const optionalString = (key: 'next_post_id' | 'prev_post_id') => {
    const rawValue = value[key];
    if (rawValue === undefined) {
      return undefined;
    }
    const selectedValue = stringValue(rawValue, 200);
    if (selectedValue === undefined) {
      return malformedPostList(action);
    }
    return selectedValue;
  };
  const nextPostId = optionalString('next_post_id');
  const previousPostId = optionalString('prev_post_id');
  const hasNext = booleanValue(value.has_next);
  if (value.has_next !== undefined && hasNext === undefined) {
    return malformedPostList(action);
  }

  if (value.matches !== undefined && !isRecord(value.matches)) {
    return malformedPostList(action);
  }
  const matchesSource = isRecord(value.matches) ? value.matches : {};
  const matches = Object.fromEntries(
    order.flatMap((postId) => {
      const rawMatches = matchesSource[postId];
      if (rawMatches !== undefined && !Array.isArray(rawMatches)) {
        return malformedPostList(action);
      }
      if (!Array.isArray(rawMatches)) {
        return [];
      }
      const postMatches = rawMatches.slice(0, MAX_MATCHES_PER_POST).map((match) => {
        const selectedMatch = stringValue(match, MAX_MATCH_LENGTH);
        if (selectedMatch === undefined) {
          return malformedPostList(action);
        }
        return selectedMatch;
      });
      return [[postId, postMatches] as const];
    })
  );

  return {
    posts,
    ...(nextPostId !== undefined ? { nextPostId } : {}),
    ...(previousPostId !== undefined ? { previousPostId } : {}),
    ...(hasNext !== undefined ? { hasNext } : {}),
    ...(firstInaccessiblePostTime !== undefined ? { firstInaccessiblePostTime } : {}),
    ...(sourceOrder.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
    ...(includeMatches ? { matches } : {}),
  };
};

const getCurrentUser = async (ctx: ActionContext, action: string) => {
  const response = await request(action, () =>
    ctx.client.get(`${getBaseUrl(ctx)}/api/v4/users/me`)
  );
  const user = trimUser(response.data);
  if (!user.id) {
    throw new Error(`Mattermost ${action} failed: /api/v4/users/me returned no user ID`);
  }
  return { ...user, id: user.id };
};

const trimCollection = <T extends { id?: string }>(
  value: unknown,
  trim: (item: unknown) => T,
  key: string,
  action: string
) => {
  if (!Array.isArray(value)) {
    throw new Error(`Mattermost ${action} failed: expected an array response`);
  }
  const items = value;
  const selectedItems = items.slice(0, MAX_LIST_ITEMS).map((item) => {
    if (!isRecord(item)) {
      throw new Error(`Mattermost ${action} failed: response item did not include an ID`);
    }
    const selectedItem = trim(item);
    if (!selectedItem.id) {
      throw new Error(`Mattermost ${action} failed: response item did not include an ID`);
    }
    return selectedItem;
  });
  return {
    [key]: selectedItems,
    ...(items.length > MAX_LIST_ITEMS ? { truncated: true } : {}),
  };
};

export const Mattermost: ConnectorSpec = {
  metadata: {
    id: '.mattermost',
    displayName: 'Mattermost',
    description: i18n.translate('core.kibanaConnectorSpecs.mattermost.metadata.description', {
      defaultMessage:
        'Browse teams and channels, find users, search conversations, and post messages in Mattermost',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'bearer',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.mattermost.auth.bearer.label', {
            defaultMessage: 'Bot access token',
          }),
          meta: {
            token: {
              label: i18n.translate(
                'core.kibanaConnectorSpecs.mattermost.auth.bearer.token.label',
                { defaultMessage: 'Bot access token' }
              ),
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.mattermost.auth.bearer.token.helpText',
                {
                  defaultMessage:
                    'A Mattermost bot account access token. Add the bot to every team and channel used by the connector. Grant create_post for createPost, create_direct_channel for createDirectChannel, and upload_file when createPost attaches fileIds.',
                }
              ),
            },
          },
        },
      },
    ],
    headers: {
      Accept: 'application/json',
    },
  },

  schema: MattermostConfigSchema,

  validateUrls: {
    fields: ['serverUrl'],
  },

  skill: `Mattermost is a collaboration platform organized into teams, channels, posts, and post threads.

Typical flow:
1. Use listTeams to resolve a team ID visible to the bot.
2. Use listChannels with that team ID to resolve a channel ID.
3. Use listPosts, getThread, or searchPosts to gather conversation context.
4. In a workflow, use createPost to send a channel message or reply. To message a person directly, use findUserByEmail, createDirectChannel, then createPost with the returned channel ID.

Search tips:
- searchPosts supports Mattermost modifiers such as from:username and in:channel-name.
- Search pagination only takes effect when Elasticsearch search is configured on the Mattermost server.
- listPosts since mode cannot be combined with page, perPage, before, or after and may return up to 1000 modified posts.

Safety:
- createDirectChannel and createPost are workflow-only write actions. Confirm the intended recipient or channel before executing them.
- Grant the bot create_direct_channel for createDirectChannel and create_post for createPost. Attaching existing fileIds also requires upload_file.
- Mattermost accepts priority metadata only on root posts and only when PostPriority is enabled. Omit priority whenever createPost includes rootId for a thread reply. requestedAck also requires an eligible Professional or Enterprise plan.
- File upload is not included. createPost can attach at most ten file IDs that already exist in Mattermost when the bot has upload_file.
- getThread normally returns empty nextPostId and previousPostId values. When hasNext is true, continue with the last returned reply's id as fromPost and its createAt as fromCreateAt.`,

  actions: {
    listTeams: {
      isTool: true,
      scope: 'read',
      description:
        'List teams that the authenticated bot belongs to. Resolves the bot user ID first because the teams endpoint requires a user GUID. Returns selected team identity and timestamp fields.',
      input: EmptyInputSchema,
      handler: async (ctx) => {
        const currentUser = await getCurrentUser(ctx, 'listTeams');
        const response = await request('listTeams', () =>
          ctx.client.get(
            `${getBaseUrl(ctx)}/api/v4/users/${encodeURIComponent(currentUser.id)}/teams`
          )
        );
        return trimCollection(response.data, trimTeam, 'teams', 'listTeams');
      },
    },

    listChannels: {
      isTool: true,
      scope: 'read',
      description:
        'List channels in a team that the authenticated bot can access. Use listTeams first to resolve teamId. Returns selected channel identity, purpose, message count, and timestamp fields.',
      input: ListChannelsInputSchema,
      handler: async (ctx, input: ListChannelsInput) => {
        const currentUser = await getCurrentUser(ctx, 'listChannels');
        const response = await request('listChannels', () =>
          ctx.client.get(
            `${getBaseUrl(ctx)}/api/v4/users/${encodeURIComponent(
              currentUser.id
            )}/teams/${encodeURIComponent(input.teamId)}/channels`
          )
        );
        return trimCollection(response.data, trimChannel, 'channels', 'listChannels');
      },
    },

    findUserByEmail: {
      isTool: true,
      scope: 'read',
      description:
        'Find one visible Mattermost user by exact email address. Use the returned user ID with createDirectChannel. Availability depends on server email privacy settings.',
      input: FindUserByEmailInputSchema,
      handler: async (ctx, input: FindUserByEmailInput) => {
        const response = await request('findUserByEmail', () =>
          ctx.client.get(`${getBaseUrl(ctx)}/api/v4/users/email/${encodeURIComponent(input.email)}`)
        );
        const user = trimUser(response.data);
        if (!user.id) {
          throw new Error('Mattermost findUserByEmail failed: response did not include a user ID');
        }
        return { user };
      },
    },

    createDirectChannel: {
      isTool: false,
      scope: 'write',
      description:
        'Create or return a direct-message channel between the authenticated bot and one other Mattermost user. The request always contains exactly those two user IDs and requires create_direct_channel. Workflow-only write action.',
      input: CreateDirectChannelInputSchema,
      handler: async (ctx, input: CreateDirectChannelInput) => {
        const currentUser = await getCurrentUser(ctx, 'createDirectChannel');
        if (currentUser.id === input.userId) {
          throw new Error('Mattermost createDirectChannel requires a user other than the bot');
        }
        const response = await request('createDirectChannel', () =>
          ctx.client.post(`${getBaseUrl(ctx)}/api/v4/channels/direct`, [
            currentUser.id,
            input.userId,
          ])
        );
        const channel = trimChannel(response.data);
        if (!channel.id) {
          throw new Error(
            'Mattermost createDirectChannel failed: response did not include a channel ID'
          );
        }
        return { channel };
      },
    },

    createPost: {
      isTool: false,
      scope: 'write',
      description:
        'Create a Mattermost root post or thread reply with valid bounded JSON props. Requires create_post; attaching existing fileIds also requires upload_file. Important or urgent priority is available only for root posts with PostPriority enabled, and requestedAck also requires an eligible Professional or Enterprise plan. Supports Mattermost Markdown. Workflow-only write action.',
      input: CreatePostInputSchema,
      handler: async (ctx, input: CreatePostInput) => {
        const body = {
          channel_id: input.channelId,
          message: input.message,
          ...(input.rootId !== undefined ? { root_id: input.rootId } : {}),
          ...(input.fileIds !== undefined ? { file_ids: input.fileIds } : {}),
          ...(input.props !== undefined ? { props: input.props } : {}),
          ...(input.priority !== undefined
            ? {
                metadata: {
                  priority: {
                    priority: input.priority.priority,
                    ...(input.priority.requestedAck !== undefined
                      ? { requested_ack: input.priority.requestedAck }
                      : {}),
                  },
                },
              }
            : {}),
        };
        const response = await request('createPost', () =>
          ctx.client.post(`${getBaseUrl(ctx)}/api/v4/posts`, body)
        );
        const post = trimPost(response.data);
        if (!post.id) {
          throw new Error('Mattermost createPost failed: response did not include a post ID');
        }
        return { post };
      },
    },

    listPosts: {
      isTool: true,
      scope: 'read',
      description:
        'List posts in a channel as a selected ordered array. Use page and perPage for bounded pagination, before or after as a post cursor, or since alone for posts modified after a Unix-millisecond timestamp. Since mode may return up to 1000 posts.',
      input: ListPostsInputSchema,
      handler: async (ctx, input: ListPostsInput) => {
        let params: Record<string, number | string>;
        if (input.since !== undefined) {
          params = { since: input.since };
        } else if (input.before !== undefined || input.after !== undefined) {
          params = {
            ...(input.before !== undefined ? { before: input.before } : {}),
            ...(input.after !== undefined ? { after: input.after } : {}),
            ...(input.page !== undefined ? { page: input.page } : {}),
            ...(input.perPage !== undefined ? { per_page: input.perPage } : {}),
          };
        } else {
          params = { page: input.page ?? 0, per_page: input.perPage ?? DEFAULT_PER_PAGE };
        }
        const response = await request('listPosts', () =>
          ctx.client.get(
            `${getBaseUrl(ctx)}/api/v4/channels/${encodeURIComponent(input.channelId)}/posts`,
            { params }
          )
        );
        return trimPostList(response.data, 'listPosts');
      },
    },

    getThread: {
      isTool: true,
      scope: 'read',
      description:
        'Get a bounded page of a Mattermost post thread. When hasNext is true, continue with the last returned reply ID as fromPost and its createAt as fromCreateAt; nextPostId and previousPostId are normally empty. Direction defaults to down.',
      input: GetThreadInputSchema,
      handler: async (ctx, input: GetThreadInput) => {
        const params = {
          perPage: input.perPage ?? DEFAULT_PER_PAGE,
          direction: input.direction ?? 'down',
          ...(input.fromPost !== undefined ? { fromPost: input.fromPost } : {}),
          ...(input.fromCreateAt !== undefined ? { fromCreateAt: input.fromCreateAt } : {}),
        };
        const response = await request('getThread', () =>
          ctx.client.get(
            `${getBaseUrl(ctx)}/api/v4/posts/${encodeURIComponent(input.postId)}/thread`,
            { params }
          )
        );
        return trimPostList(response.data, 'getThread', { allowInaccessibleSentinel: true });
      },
    },

    searchPosts: {
      isTool: true,
      scope: 'read',
      description:
        'Search posts visible to the bot within a team. Supports Mattermost search modifiers such as from:username and in:channel-name. Page and perPage only take effect when Mattermost Elasticsearch search is configured.',
      input: SearchPostsInputSchema,
      handler: async (ctx, input: SearchPostsInput) => {
        const response = await request('searchPosts', () =>
          ctx.client.post(
            `${getBaseUrl(ctx)}/api/v4/teams/${encodeURIComponent(input.teamId)}/posts/search`,
            {
              terms: input.terms,
              is_or_search: input.isOrSearch ?? false,
              page: input.page ?? 0,
              per_page: input.perPage ?? DEFAULT_PER_PAGE,
            }
          )
        );
        return trimPostList(response.data, 'searchPosts', { includeMatches: true });
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.mattermost.test.description', {
      defaultMessage: 'Verifies the Mattermost connection by retrieving the authenticated bot user',
    }),
    handler: async (ctx) => {
      const currentUser = await getCurrentUser(ctx, 'connection test');
      const identity = currentUser.username ?? currentUser.id;
      return { message: `Connected to Mattermost as ${identity}.` };
    },
  },
};
