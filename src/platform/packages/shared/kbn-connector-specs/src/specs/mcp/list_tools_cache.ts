/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LRUCache } from 'lru-cache';
import type { ListToolsResponse } from '@kbn/mcp-client';
import hash from 'object-hash';

export const LIST_TOOLS_CACHE_TTL_MS = 15 * 60 * 1000;
export const LIST_TOOLS_CACHE_MAX_SIZE = 100;

export const listToolsCache = new LRUCache<string, ListToolsResponse>({
  max: LIST_TOOLS_CACHE_MAX_SIZE,
  ttl: LIST_TOOLS_CACHE_TTL_MS,
  allowStale: false,
  ttlAutopurge: false,
});

export const buildListToolsCacheKey = (
  connectorId: string,
  config: {
    serverUrl: string;
    headers?: Record<string, string>;
    hasAuth?: boolean;
    authType?: string;
  },
  authHeaders: Record<string, string>
): string => {
  const configHash = hash({
    serverUrl: config.serverUrl,
    headers: config.headers,
    hasAuth: config.hasAuth,
    authType: config.authType,
    authHeaders,
  });
  return `${connectorId}:${configHash}`;
};
