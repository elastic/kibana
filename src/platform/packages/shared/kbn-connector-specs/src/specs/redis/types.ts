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
// =============================================================================

export const INFO_SECTIONS = [
  'server',
  'clients',
  'memory',
  'persistence',
  'stats',
  'replication',
  'cpu',
  'errorstats',
  'keyspace',
] as const;

export const KEY_TYPES = ['string', 'hash', 'list', 'set', 'zset', 'stream'] as const;

export const ServerInfoInputSchema = lazySchema(() =>
  z.object({
    section: z
      .enum(INFO_SECTIONS)
      .optional()
      .describe(
        'INFO section to return: server, clients, memory, persistence, stats, replication, cpu, errorstats, or keyspace. Defaults to server. Use keyspace to see how many keys each database holds.'
      ),
  })
);
export type ServerInfoInput = z.infer<typeof ServerInfoInputSchema>;

export const ListKeysInputSchema = lazySchema(() =>
  z.object({
    pattern: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe(
        'Glob-style pattern the key names must match, for example "user:*" or "session:??:*". Supports * ? [abc] [^a] [a-z]; use a backslash to escape them. Defaults to "*" (all keys).'
      ),
    type: z
      .enum(KEY_TYPES)
      .optional()
      .describe('Only return keys of this data type: string, hash, list, set, zset, or stream.'),
    count: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        'Number of keys to aim for in this call (1-1000, default: 100). A call can return slightly more, because whole scan pages are kept so no key is skipped.'
      ),
    cursor: z
      .string()
      .max(20)
      .regex(/^\d{1,20}$/, {
        message: 'Cursor must be the numeric cursor returned by a previous call',
      })
      .optional()
      .describe(
        'Cursor returned as nextCursor by a previous call, to continue the scan. Omit to start from the beginning.'
      ),
  })
);
export type ListKeysInput = z.infer<typeof ListKeysInputSchema>;

// Longer or empty names are skipped by listKeys, so every name listKeys returns can be passed to getKey.
export const MAX_KEY_LENGTH = 1024;

export const GetKeyInputSchema = lazySchema(() =>
  z.object({
    key: z
      .string()
      .min(1)
      .max(MAX_KEY_LENGTH)
      .describe(
        'Exact name of the key to read, as returned by listKeys (for example "user:1001").'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe(
        'Maximum number of elements to return for a hash, list, set, sorted set, or stream (1-500, default: 100). Does not apply to strings.'
      ),
  })
);
export type GetKeyInput = z.infer<typeof GetKeyInputSchema>;

export const ExecuteCommandInputSchema = lazySchema(() =>
  z.object({
    command: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z][A-Za-z0-9._-]*$/, {
        message: 'Command must be a single Redis command name such as SET or HSET',
      })
      .describe('Redis command name, for example "SET", "HSET", "DEL", or "EXPIRE".'),
    args: z
      .array(z.string().max(65536))
      .max(100)
      .optional()
      .describe(
        'Command arguments in order, each as a string (for example ["user:1001:name", "Ada"] for SET). Omit for commands without arguments.'
      ),
  })
);
export type ExecuteCommandInput = z.infer<typeof ExecuteCommandInputSchema>;
