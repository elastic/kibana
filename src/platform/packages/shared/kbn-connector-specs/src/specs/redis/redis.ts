/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Redis Connector
 *
 * Connects directly to a Redis server over the RESP binary protocol (via `ioredis`) rather than HTTP.
 * The client is managed by the framework's client lease pool via `ctx.getClient('redis')`, which handles
 * lifecycle and enforces `xpack.actions.allowedHosts` before the first connection.
 *
 * Username and password are declared under `auth: { types: ['basic'] }` so they are encrypted at rest;
 * `redisClientType` in `lib/clients/redis.ts` decodes them from the Authorization header.
 *
 * The read actions only issue commands that cannot change data (SCAN, TYPE, GET and its siblings, INFO).
 * `executeCommand` is unrestricted and carries `scope: 'destroy'`.
 */
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Redis } from 'ioredis';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getKey, getMaxContentLength, listKeys, parseInfo } from './key_reader';
import {
  type ExecuteCommandInput,
  ExecuteCommandInputSchema,
  type GetKeyInput,
  GetKeyInputSchema,
  type ListKeysInput,
  ListKeysInputSchema,
  type ServerInfoInput,
  ServerInfoInputSchema,
} from './types';

const withClient = async <T>(ctx: ActionContext, fn: (client: Redis) => Promise<T>): Promise<T> =>
  fn(await ctx.getClient('redis'));

export const RedisConnector: ConnectorSpec = {
  metadata: {
    id: '.redis',
    displayName: 'Redis',
    description: i18n.translate('connectorSpecs.redis.metadata.description', {
      defaultMessage: 'Browse keys, read values, inspect server info, and run commands in Redis',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder'],
  },

  auth: {
    types: ['basic'],
  },

  schema: lazySchema(() =>
    z.object({
      host: z
        .string()
        .min(1)
        .max(253)
        .regex(/^(?:[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?|\[[0-9A-Fa-f:.]+\])$/, {
          message:
            'Host must be a hostname or IP address (an IPv6 address in square brackets), without a protocol prefix, port, or path',
        })
        .describe(
          i18n.translate('connectorSpecs.redis.config.host.description', {
            defaultMessage: 'The Redis server hostname or IP address',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.redis.config.host.label', {
            defaultMessage: 'Host',
          }),
          placeholder: 'redis.example.com',
          helpText: i18n.translate('connectorSpecs.redis.config.host.helpText', {
            defaultMessage: 'The hostname or IP address of the Redis server (no protocol prefix).',
          }),
        }),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(6379)
        .describe(
          i18n.translate('connectorSpecs.redis.config.port.description', {
            defaultMessage: 'The Redis server port',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.redis.config.port.label', {
            defaultMessage: 'Port',
          }),
          placeholder: '6379',
          helpText: i18n.translate('connectorSpecs.redis.config.port.helpText', {
            defaultMessage: 'The port of the Redis server (default: 6379)',
          }),
        }),
      database: z
        .number()
        .int()
        .min(0)
        .max(255)
        .default(0)
        .describe(
          i18n.translate('connectorSpecs.redis.config.database.description', {
            defaultMessage: 'The numbered Redis database to use',
          })
        )
        .meta({
          widget: 'number',
          label: i18n.translate('connectorSpecs.redis.config.database.label', {
            defaultMessage: 'Database number',
          }),
          placeholder: '0',
          helpText: i18n.translate('connectorSpecs.redis.config.database.helpText', {
            defaultMessage:
              'The numbered database to select after connecting (default: 0). Redis Cluster is not supported.',
          }),
        }),
      ssl: z
        .enum(['required', 'disabled'])
        .default('required')
        .describe(
          i18n.translate('connectorSpecs.redis.config.ssl.description', {
            defaultMessage: 'Whether to use TLS when connecting to Redis',
          })
        )
        .meta({
          widget: 'select',
          label: i18n.translate('connectorSpecs.redis.config.ssl.label', {
            defaultMessage: 'TLS',
          }),
          helpText: i18n.translate('connectorSpecs.redis.config.ssl.helpText', {
            defaultMessage:
              'Required (default) encrypts the connection using Kibana TLS settings. Disable only for servers that do not offer TLS.',
          }),
        }),
    })
  ),

  actions: {
    serverInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Return server information and the number of keys in the selected database. Use this first to check which Redis version and mode the server runs, how much memory it uses, and, with section keyspace, which numbered databases hold keys. Returns { dbSize, info } where info maps each INFO field to its value.',
      input: ServerInfoInputSchema,
      handler: async (ctx, input: ServerInfoInput) =>
        withClient(ctx, async (client) => {
          const [raw, dbSize] = await Promise.all([
            client.info(input.section ?? 'server'),
            client.dbsize(),
          ]);
          return { dbSize, info: parseInfo(raw) };
        }),
    },

    listKeys: {
      isTool: true,
      scope: 'read',
      description:
        'List key names matching a glob pattern, optionally of one data type, using SCAN so the server is never blocked. Use this to discover keys before reading them with getKey. Names that are empty or longer than 1024 characters are not listed. Returns { keys, nextCursor }; pass nextCursor back as cursor to continue, and nextCursor is null when the scan is complete. A page can contain no matches and still have a nextCursor.',
      input: ListKeysInputSchema,
      handler: async (ctx, input: ListKeysInput) =>
        withClient(ctx, (client) => listKeys(client, input)),
    },

    getKey: {
      isTool: true,
      scope: 'read',
      description:
        'Read one key by its data type: a string value, a hash as an object, a list in order, a set, a sorted set as { member, score } pairs (an infinite score is the string "inf" or "-inf"), or a stream as { id, fields } entries where fields is an ordered list of [field, value] pairs. Collections return at most limit elements and report truncated: true when there are more. Returns { key, type, ttlSeconds, size, value, truncated }, or { key, exists: false } when the key does not exist. ttlSeconds is null when the key never expires. Use listKeys to find key names.',
      input: GetKeyInputSchema,
      handler: async (ctx, input: GetKeyInput) =>
        withClient(ctx, (client) => getKey(client, input)),
    },

    executeCommand: {
      isTool: false,
      scope: 'destroy',
      description:
        'Run any single Redis command with its arguments and return the reply. No restrictions: SET, DEL, HSET, EXPIRE, FLUSHDB and every other command the user is allowed to run are permitted. Use only when the workflow explicitly requires a write or destructive operation. Prefer getKey and listKeys for reading. Runs on its own connection, so a command such as SELECT does not change the database used by the other actions. Returns { reply }, truncated to the response size limit.',
      input: ExecuteCommandInputSchema,
      handler: async (ctx, input: ExecuteCommandInput) =>
        withClient(ctx, async (pooled) => {
          // A command can change the session (SELECT, MULTI, WATCH, CLIENT, a blocking read), which would leave the
          // pooled connection that getKey and listKeys share in a different state. It runs on its own connection.
          const dedicated = pooled.duplicate();
          dedicated.on('error', () => {});
          try {
            await dedicated.connect();
            const reply = await dedicated.call(input.command, ...(input.args ?? []));
            const serialized = JSON.stringify(reply) ?? 'null';
            const limit = getMaxContentLength(pooled);
            if (serialized.length <= limit) return { reply, truncated: false };
            return { reply: serialized.slice(0, limit), truncated: true };
          } finally {
            dedicated.disconnect();
          }
        }),
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.redis.test.description', {
      defaultMessage: 'Verifies the Redis connection by sending a PING',
    }),
    enabled: true,
    handler: async (ctx) => {
      await withClient(ctx, (client) => client.ping());
      return { message: 'Successfully connected to Redis' };
    },
  },

  skill: [
    '## Redis Connector',
    '',
    'Access to a Redis server. `serverInfo`, `listKeys` and `getKey` are read-only and safe to call freely. `executeCommand` is unrestricted and is not available to agents.',
    '',
    '### Discovery pattern (keys unknown)',
    '1. `serverInfo` with section `keyspace`: see which numbered databases hold keys and how many.',
    '2. `listKeys` with a pattern such as `user:*`: find key names. Keep calling with `nextCursor` until it is null.',
    '3. `getKey`: read a key. Its `type` tells you how to interpret `value`.',
    '',
    '### Gotchas',
    '- Redis has no query language. Key names are the only index, so pick patterns from the naming scheme you see in `listKeys` (for example `order:*`) rather than scanning everything.',
    '- Key names and patterns are case-sensitive. The connector uses the database number from its configuration; other numbered databases are not reachable.',
    '- A `listKeys` page with no keys can still have a `nextCursor`: that is how SCAN works, not a failure.',
    '- Values are returned as UTF-8 text. A binary value shows as garbled characters, and a string over 64 KiB is cut short with `truncated: true`.',
    '- `ttlSeconds: null` means the key has no expiry; a key that expires between `listKeys` and `getKey` comes back as `exists: false`.',
    '- A key of a Redis module type (JSON, TimeSeries, and others) returns its `type` with a null `value`. You can identify the type, but you cannot read the value.',
  ].join('\n'),
};
