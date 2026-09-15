/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { HttpStart } from '@kbn/core/public';
import { SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import { LRUCache } from 'lru-cache';

export interface ESQLSourceInfo {
  timeField?: string;
  columns: Array<{ name: string; esType: string }>;
}

const sourceInfoCache = new LRUCache<string, Promise<ESQLSourceInfo>>({ max: 100 });

export async function getESQLSourceInfo({
  query,
  http,
  projectRouting,
  timeRange,
}: {
  query: string;
  http: HttpStart;
  projectRouting?: string;
  timeRange?: { from: string; to: string };
}): Promise<ESQLSourceInfo> {
  const cacheKey = JSON.stringify([query, projectRouting]);

  const cached = sourceInfoCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = http
    .post<ESQLSourceInfo>(SOURCE_INFO_ROUTE, {
      body: JSON.stringify({ query, projectRouting, timeRange }),
    })
    .catch((error) => {
      sourceInfoCache.delete(cacheKey);
      throw error;
    });

  sourceInfoCache.set(cacheKey, pending);
  return pending;
}
