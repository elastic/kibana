/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import hash from 'object-hash';
import {
  LIST_TOOLS_CACHE_MAX_SIZE,
  LIST_TOOLS_CACHE_TTL_MS,
  buildListToolsCacheKey,
  listToolsCache,
} from './list_tools_cache';

describe('listTools cache', () => {
  const config = {
    serverUrl: 'https://example.com/mcp',
    headers: { 'X-Custom': 'a' },
    hasAuth: true,
    authType: 'bearer',
  };
  const authHeaders = { Authorization: 'Bearer secret' };

  beforeEach(() => {
    listToolsCache.clear();
  });

  it('matches the legacy key formula', () => {
    const expected = `connector-1:${hash({
      serverUrl: config.serverUrl,
      headers: config.headers,
      hasAuth: config.hasAuth,
      authType: config.authType,
      authHeaders,
    })}`;

    expect(buildListToolsCacheKey('connector-1', config, authHeaders)).toBe(expected);
  });

  it('changes the key when connector id, config, or auth headers change', () => {
    const base = buildListToolsCacheKey('connector-1', config, authHeaders);
    expect(buildListToolsCacheKey('connector-2', config, authHeaders)).not.toBe(base);
    expect(
      buildListToolsCacheKey(
        'connector-1',
        { ...config, serverUrl: 'https://other.example' },
        authHeaders
      )
    ).not.toBe(base);
    expect(
      buildListToolsCacheKey('connector-1', config, { Authorization: 'Bearer other' })
    ).not.toBe(base);
  });

  it('uses the legacy TTL and size', async () => {
    expect(listToolsCache.max).toBe(LIST_TOOLS_CACHE_MAX_SIZE);
    expect(listToolsCache.ttl).toBe(LIST_TOOLS_CACHE_TTL_MS);

    const shortLived = new LRUCache<string, { tools: never[] }>({
      max: 1,
      ttl: 15,
      allowStale: false,
    });
    shortLived.set('key', { tools: [] });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(shortLived.get('key')).toBeUndefined();
  });
});
