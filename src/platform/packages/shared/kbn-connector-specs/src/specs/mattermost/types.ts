/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas } from '../../connector_spec';

const MAX_ID_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 16_383;
const MAX_PROPS_KEYS = 50;
const MAX_PROPS_SERIALIZED_LENGTH = 20_000;
const MAX_PAGE = 10_000;
const MAX_PER_PAGE = 200;
const DEFAULT_PER_PAGE = 60;

const isJsonValue = (value: unknown, ancestors: WeakSet<object>): boolean => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  if (ancestors.has(value)) {
    return false;
  }

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!isArray && prototype !== Object.prototype && prototype !== null) {
    return false;
  }

  const keys = Object.keys(value);
  const ownKeys = Reflect.ownKeys(value);
  if (
    (!isArray && ownKeys.length !== keys.length) ||
    (isArray && (ownKeys.length !== keys.length + 1 || !ownKeys.includes('length')))
  ) {
    return false;
  }
  if (
    isArray &&
    (keys.length !== value.length || keys.some((key, index) => key !== String(index)))
  ) {
    return false;
  }

  ancestors.add(value);
  const childValues = isArray ? value : keys.map((key) => (value as Record<string, unknown>)[key]);
  const valid = childValues.every((child) => isJsonValue(child, ancestors));
  ancestors.delete(value);
  return valid;
};

const isBoundedJsonObject = (value: Record<string, unknown>): boolean => {
  try {
    if (!isJsonValue(value, new WeakSet())) {
      return false;
    }
    const serialized = JSON.stringify(value);
    return serialized !== undefined && serialized.length <= MAX_PROPS_SERIALIZED_LENGTH;
  } catch {
    return false;
  }
};

const idSchema = (description: string) =>
  z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/, 'IDs contain only letters, numbers, hyphens, and underscores')
    .describe(description);

export const MattermostConfigSchema = lazySchema(() =>
  z.object({
    serverUrl: UISchemas.url('https://mattermost.example.com')
      .max(2048)
      .superRefine((value, ctx) => {
        let url: URL;
        try {
          url = new URL(value);
        } catch {
          return;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          ctx.addIssue({
            code: 'custom',
            message: 'Mattermost server URL must use HTTP or HTTPS',
          });
        }
        if (url.username || url.password) {
          ctx.addIssue({
            code: 'custom',
            message: 'Mattermost server URL must not include credentials',
          });
        }
        if (url.search || url.hash) {
          ctx.addIssue({
            code: 'custom',
            message: 'Mattermost server URL must not include a query string or fragment',
          });
        }
        if (/\/api\/v4\/?$/i.test(url.pathname)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Mattermost server URL must not include /api/v4',
          });
        }
      })
      .describe('Mattermost Site URL, including an optional deployment subpath but without /api/v4')
      .meta({
        widget: 'text',
        label: i18n.translate('core.kibanaConnectorSpecs.mattermost.config.serverUrl.label', {
          defaultMessage: 'Mattermost server URL',
        }),
        helpText: i18n.translate('core.kibanaConnectorSpecs.mattermost.config.serverUrl.helpText', {
          defaultMessage:
            'The Site URL of your Mattermost server, for example https://mattermost.example.com or https://example.com/company/mattermost. Do not include /api/v4.',
        }),
        placeholder: 'https://mattermost.example.com',
        validate: { allowedHosts: true },
      }),
  })
);
export type MattermostConfig = z.infer<typeof MattermostConfigSchema>;

export const EmptyInputSchema = lazySchema(() => z.object({}));
export type EmptyInput = z.infer<typeof EmptyInputSchema>;

export const ListChannelsInputSchema = lazySchema(() =>
  z.object({
    teamId: idSchema('Team ID returned by listTeams'),
  })
);
export type ListChannelsInput = z.infer<typeof ListChannelsInputSchema>;

export const FindUserByEmailInputSchema = lazySchema(() =>
  z.object({
    email: z.email().max(320).describe('Exact email address of the Mattermost user to find'),
  })
);
export type FindUserByEmailInput = z.infer<typeof FindUserByEmailInputSchema>;

export const CreateDirectChannelInputSchema = lazySchema(() =>
  z.object({
    userId: idSchema('ID of the other user in the direct message'),
  })
);
export type CreateDirectChannelInput = z.infer<typeof CreateDirectChannelInputSchema>;

export const CreatePostInputSchema = lazySchema(() =>
  z
    .object({
      channelId: idSchema('ID of the channel where the post will be created'),
      message: z
        .string()
        .min(1)
        .max(MAX_MESSAGE_LENGTH)
        .describe('Post message in Mattermost Markdown'),
      rootId: idSchema('Root post ID when creating a reply').optional(),
      fileIds: z
        .array(idSchema('ID of a file that is already uploaded to Mattermost'))
        .max(10)
        .optional()
        .describe(
          'Previously uploaded file IDs to attach, up to the Mattermost limit of ten. Requires upload_file'
        ),
      props: z
        .record(z.string().min(1).max(128), z.unknown())
        .refine((value) => Object.keys(value).length <= MAX_PROPS_KEYS, {
          message: `props must have at most ${MAX_PROPS_KEYS} keys`,
        })
        .refine(isBoundedJsonObject, {
          message: `props must contain only JSON values and serialize to at most ${MAX_PROPS_SERIALIZED_LENGTH} characters`,
        })
        .optional()
        .describe(
          `JSON property bag to attach to the post, limited to ${MAX_PROPS_KEYS} keys and ${MAX_PROPS_SERIALIZED_LENGTH} serialized characters`
        ),
      priority: z
        .object({
          priority: z
            .enum(['important', 'urgent'])
            .describe('Mattermost priority label for the root post'),
          requestedAck: z
            .boolean()
            .optional()
            .describe('Whether recipients are asked to acknowledge the root post'),
        })
        .optional()
        .describe(
          'Optional priority metadata for a root post when PostPriority is enabled. Omit for standard priority and all thread replies. requestedAck also requires an eligible Professional or Enterprise plan'
        ),
    })
    .refine((value) => value.rootId === undefined || value.priority === undefined, {
      message: 'priority cannot be set on a thread reply',
    })
);
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const ListPostsInputSchema = lazySchema(() =>
  z
    .object({
      channelId: idSchema('ID of the channel whose posts should be listed'),
      page: z
        .number()
        .int()
        .min(0)
        .max(MAX_PAGE)
        .optional()
        .describe('Zero-based page number. Omit when since is provided'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(MAX_PER_PAGE)
        .optional()
        .describe(
          `Posts per page, from 1 to ${MAX_PER_PAGE}. Defaults to ${DEFAULT_PER_PAGE}. Omit when since is provided`
        ),
      since: z
        .number()
        .int()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe(
          'Unix time in milliseconds. Returns posts modified after this time, with a server-side limit of 1000. Cannot be combined with page, perPage, before, or after'
        ),
      before: idSchema('Return posts created before this post ID cursor').optional(),
      after: idSchema('Return posts created after this post ID cursor').optional(),
    })
    .refine(
      (value) =>
        [value.since !== undefined, value.before !== undefined, value.after !== undefined].filter(
          Boolean
        ).length <= 1,
      {
        message: 'since, before, and after are mutually exclusive',
      }
    )
    .refine(
      (value) =>
        value.since === undefined || (value.page === undefined && value.perPage === undefined),
      {
        message: 'since cannot be combined with page or perPage',
      }
    )
);
export type ListPostsInput = z.infer<typeof ListPostsInputSchema>;

export const GetThreadInputSchema = lazySchema(() =>
  z
    .object({
      postId: idSchema('ID of the root post or any reply in the thread'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(MAX_PER_PAGE)
        .default(DEFAULT_PER_PAGE)
        .describe(`Posts per page, from 1 to ${MAX_PER_PAGE}`),
      fromPost: idSchema('Post ID cursor returned in the previous page').optional(),
      fromCreateAt: z
        .number()
        .int()
        .min(1)
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Creation timestamp of fromPost in Unix milliseconds; required with fromPost'),
      direction: z
        .enum(['up', 'down'])
        .default('down')
        .describe('Thread page direction. Defaults to down'),
    })
    .refine((value) => value.fromPost === undefined || value.fromCreateAt !== undefined, {
      message: 'fromCreateAt is required when fromPost is provided',
    })
);
export type GetThreadInput = z.infer<typeof GetThreadInputSchema>;

export const SearchPostsInputSchema = lazySchema(() =>
  z.object({
    teamId: idSchema('ID of the team whose visible posts should be searched'),
    terms: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Mattermost search terms. Supports modifiers such as from:username and in:channel-name'
      ),
    isOrSearch: z
      .boolean()
      .default(false)
      .describe('Use OR semantics instead of the default AND semantics'),
    page: z
      .number()
      .int()
      .min(0)
      .max(MAX_PAGE)
      .default(0)
      .describe('Zero-based results page. Requires Elasticsearch on the Mattermost server'),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(MAX_PER_PAGE)
      .default(DEFAULT_PER_PAGE)
      .describe(
        `Posts per search page, from 1 to ${MAX_PER_PAGE}. Requires Elasticsearch on the Mattermost server`
      ),
  })
);
export type SearchPostsInput = z.infer<typeof SearchPostsInputSchema>;
