/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Redis } from 'ioredis';
import { getResponseLimit } from '../../lib/clients/mssql_response_limit';
import { MAX_KEY_LENGTH } from './types';
import type { GetKeyInput, ListKeysInput } from './types';

export const DEFAULT_COUNT = 100;
export const DEFAULT_LIMIT = 100;
// SCAN may return an empty page while keys remain, so one call keeps scanning up to this many pages.
const MAX_SCAN_PAGES = 50;
const STRING_PREVIEW_BYTES = 64 * 1024;
const DEFAULT_MAX_CONTENT_LENGTH = 100 * 1024 * 1024;

/** The Actions maximum response size recorded on the client when it was built. */
export const getMaxContentLength = (client: Redis): number =>
  getResponseLimit(client) ?? DEFAULT_MAX_CONTENT_LENGTH;

const byteLength = (value: unknown): number => Buffer.byteLength(JSON.stringify(value) ?? 'null');

// Largest prefix of `items` whose JSON form fits in `limit` bytes (the length grows with the prefix, so bisect).
const fitPrefix = <T>(items: T[], limit: number): T[] => {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (byteLength(items.slice(0, middle)) <= limit) low = middle;
    else high = middle - 1;
  }
  return items.slice(0, low);
};

// Cuts a value that would exceed the response limit. The limit bounds what the connector returns; the driver
// has already received the full reply by then.
const fitToLimit = (value: unknown, limit: number): { value: unknown; truncated: boolean } => {
  if (byteLength(value) <= limit) return { value, truncated: false };
  if (typeof value === 'string') return { value: value.slice(0, limit), truncated: true };
  if (Array.isArray(value)) return { value: fitPrefix(value, limit), truncated: true };
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, string>);
    return { value: toHashObject(fitPrefix(entries, limit)), truncated: true };
  }
  return { value, truncated: true };
};

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
  // but the cursor never skips a key. Names getKey would reject (empty or very long) are left out.
  const unique = Array.from(new Set(keys)).filter(
    (key) => key.length > 0 && key.length <= MAX_KEY_LENGTH
  );
  // Dropping names to fit would skip keys the cursor has already passed, so an oversized page is an error.
  const limit = getMaxContentLength(client);
  if (byteLength(unique) > limit) {
    throw new Error(
      `The key names exceed the ${limit}-byte response size limit. Use a narrower pattern or a smaller count.`
    );
  }
  return { keys: unique, nextCursor: next === '0' ? null : next };
};

// Redis allows infinite scores. They have no JSON number form (JSON.stringify turns them into null), so they stay
// as the strings Redis sends: "inf" and "-inf".
const parseScore = (raw: string): number | string => {
  const score = Number(raw);
  return Number.isFinite(score) ? score : raw;
};

const pairUp = (flat: string[]): Array<{ member: string; score: number | string }> => {
  const pairs: Array<{ member: string; score: number | string }> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push({ member: flat[i], score: parseScore(flat[i + 1]) });
  }
  return pairs;
};

// A stream entry can repeat a field name, so its fields stay an ordered list of [field, value] pairs.
const toFieldPairs = (flat: string[]): Array<[string, string]> => {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1]]);
  }
  return pairs;
};

// A null-prototype object keeps a field named "__proto__" as an own property instead of dropping it.
const toHashObject = (entries: Iterable<[string, string]>): Record<string, string> => {
  const hash: Record<string, string> = Object.create(null);
  for (const [field, value] of entries) {
    hash[field] = value;
  }
  return hash;
};

// ioredis builds HGETALL replies as plain objects, which silently lose a "__proto__" field, so the hash is read
// with HSCAN. SCAN-family commands can repeat an element, hence the Map.
const readHash = async (
  client: Redis,
  key: string,
  limit: number
): Promise<Record<string, string>> => {
  const fields = new Map<string, string>();
  let cursor = '0';
  do {
    const [next, flat] = await client.hscan(key, cursor, 'COUNT', limit);
    cursor = next;
    for (const [field, value] of toFieldPairs(flat)) fields.set(field, value);
  } while (cursor !== '0' && fields.size < limit);
  return toHashObject(Array.from(fields).slice(0, limit));
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
      return { size, value: await readHash(client, key, limit), truncated: size > limit };
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
        value: entries.map(([id, fields]) => ({ id, fields: toFieldPairs(fields) })),
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
  // PTTL answers -2 when the key expired after TYPE ran.
  if (ttlMs === -2) return { key, exists: false };
  const read = await readValue(client, key, type, limit);
  const fitted = fitToLimit(read.value, getMaxContentLength(client));
  const { size } = read;
  const { value } = fitted;
  const truncated = read.truncated || fitted.truncated;
  return {
    key,
    type,
    // PTTL answers -1 for a key with no expiry.
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
