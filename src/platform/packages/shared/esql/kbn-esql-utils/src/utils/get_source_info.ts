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
import type { ESQLControlVariable } from '@kbn/esql-types';
import { LRUCache } from 'lru-cache';

export interface ESQLSourceInfoColumn {
  name: string;
  esType: string;
  originalTypes?: string[];
  columnMeta?: Record<string, unknown>;
}

export interface ESQLSourceInfo {
  columns: ESQLSourceInfoColumn[];
}

const sourceInfoCache = new LRUCache<string, Promise<ESQLSourceInfo>>({ max: 100 });

/**
 * Strips the client-only `meta` field from ES|QL control variables and returns
 * a stable JSON cache key for `(query, projectRouting, variables)`.
 * `meta` must never reach the server and must not influence cache behaviour.
 */
export function buildEsqlSourceCacheKey(
  query: string,
  projectRouting: string | undefined,
  esqlVariables: ESQLControlVariable[] | undefined
): { cacheKey: string; cleanVariables: ESQLControlVariable[] | undefined } {
  const cleanVariables = esqlVariables?.map(
    ({ key, value, type }) => ({ key, value, type } as ESQLControlVariable)
  );
  return {
    cacheKey: JSON.stringify([query, projectRouting ?? null, cleanVariables ?? null]),
    cleanVariables,
  };
}

export function clearESQLSourceInfoCache(): void {
  sourceInfoCache.clear();
}

export async function getESQLSourceInfo({
  query,
  http,
  projectRouting,
  timeRange,
  timeFieldName,
  esqlVariables,
}: {
  query: string;
  http: HttpStart;
  projectRouting?: string;
  timeRange?: { from: string; to: string };
  timeFieldName?: string;
  esqlVariables?: ESQLControlVariable[];
}): Promise<ESQLSourceInfo> {
  const { cacheKey, cleanVariables } = buildEsqlSourceCacheKey(
    query,
    projectRouting,
    esqlVariables
  );

  const cached = sourceInfoCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const pending = http
    .post<ESQLSourceInfo>(SOURCE_INFO_ROUTE, {
      body: JSON.stringify({
        query,
        projectRouting,
        timeRange,
        timeFieldName,
        esqlVariables: cleanVariables,
      }),
    })
    .catch((error) => {
      sourceInfoCache.delete(cacheKey);
      throw error;
    });

  sourceInfoCache.set(cacheKey, pending);
  return pending;
}
