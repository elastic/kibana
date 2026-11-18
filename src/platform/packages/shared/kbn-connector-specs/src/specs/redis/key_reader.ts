/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Redis } from 'ioredis';
import type { GetKeyInput, ListKeysInput } from './types';

export const DEFAULT_COUNT = 100;
export const DEFAULT_LIMIT = 100;
// SCAN may return an empty page while keys remain, so one call keeps scanning up to this many pages.
const MAX_SCAN_PAGES = 50;
const STRING_PREVIEW_BYTES = 64 * 1024;

export interface ListKeysResult {
  keys: string[];
  nextCursor: string | null;
}

export interface KeyValue {
  key: string;
  type: string;
  ttlSeconds: number | null;
  size: number | null;
  value: unknown;
  truncated: boolean;
}

/** Collects up to `count` key names matching the pattern, following SCAN until it has enough or finishes. */
export const listKeys = async (
  client: Redis,
  { pattern = '*', type, count = DEFAULT_COUNT, cursor = '0' }: ListKeysInput
): Promise<ListKeysResult> => {
  const keys: string[] = [];
  let next = cursor;
  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    const [nextCursor, batch] = type
      ? await client.scan(next, 'MATCH', pattern, 'COUNT', count, 'TYPE', type)
      : await client.scan(next, 'MATCH', pattern, 'COUNT', count);
    next = nextCursor;
    keys.push(...batch);
    if (next === '0' || keys.length >= count) break;
  }
  // SCAN can return a key more than once. Whole pages are kept, so the result can exceed count slightly,
  // but the cursor never skips a key.
  return { keys: Array.from(new Set(keys)), nextCursor: next === '0' ? null : next };
};

const pairUp = (flat: string[]): Array<{ member: string; score: number }> => {
  const pairs: Array<{ member: string; score: number }> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push({ member: flat[i], score: Number(flat[i + 1]) });
  }
  return pairs;
};

const toObject = (flat: string[]): Record<string, string> => {
  const entries: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) {
    entries[flat[i]] = flat[i + 1];
  }
  return entries;
};

const readValue = async (
  client: Redis,
  key: string,
  type: string,
  limit: number
): Promise<Pick<KeyValue, 'size' | 'value' | 'truncated'>> => {
  switch (type) {
    case 'string': {
      const size = await client.strlen(key);
      const value =
        size > STRING_PREVIEW_BYTES
          ? await client.getrange(key, 0, STRING_PREVIEW_BYTES - 1)
          : await client.get(key);
      return { size, value, truncated: size > STRING_PREVIEW_BYTES };
    }
    case 'hash': {
      const size = await client.hlen(key);
      if (size <= limit) return { size, value: await client.hgetall(key), truncated: false };
      const [, flat] = await client.hscan(key, '0', 'COUNT', limit);
      return { size, value: toObject(flat.slice(0, limit * 2)), truncated: true };
    }
    case 'list': {
      const size = await client.llen(key);
      return { size, value: await client.lrange(key, 0, limit - 1), truncated: size > limit };
    }
    case 'set': {
      const size = await client.scard(key);
      if (size <= limit) return { size, value: await client.smembers(key), truncated: false };
      const [, members] = await client.sscan(key, '0', 'COUNT', limit);
      return { size, value: members.slice(0, limit), truncated: true };
    }
    case 'zset': {
      const size = await client.zcard(key);
      const flat = await client.zrange(key, 0, String(limit - 1), 'WITHSCORES');
      return { size, value: pairUp(flat), truncated: size > limit };
    }
    case 'stream': {
      const size = await client.xlen(key);
      const entries = await client.xrange(key, '-', '+', 'COUNT', limit);
      return {
        size,
        value: entries.map(([id, fields]) => ({ id, fields: toObject(fields) })),
        truncated: size > limit,
      };
    }
    default:
      return { size: null, value: null, truncated: false };
  }
};

/** Reads one key by its type, returning at most `limit` elements of a collection. */
export const getKey = async (
  client: Redis,
  { key, limit = DEFAULT_LIMIT }: GetKeyInput
): Promise<KeyValue | { key: string; exists: false }> => {
  const type = await client.type(key);
  if (type === 'none') return { key, exists: false };
  const ttlMs = await client.pttl(key);
  const { size, value, truncated } = await readValue(client, key, type, limit);
  return {
    key,
    type,
    // PTTL answers -1 for a key with no expiry and -2 for a missing key.
    ttlSeconds: ttlMs >= 0 ? Math.ceil(ttlMs / 1000) : null,
    size,
    value,
    truncated,
  };
};

/** Parses the "name:value" lines of an INFO reply into an object, dropping "# Section" headers. */
export const parseInfo = (raw: string): Record<string, string> => {
  const info: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (line.length === 0 || line.startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    info[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return info;
};
