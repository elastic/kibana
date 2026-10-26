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
  /** Set when the query failed (e.g. invalid or partial query); the request is not cached. */
  error?: { statusCode: number; message: string };
}

/** A shared request, aborted only once every caller waiting on it has aborted. */
interface SourceInfoRequest {
  promise: Promise<ESQLSourceInfo>;
  controller: AbortController;
  waiters: number;
  settled: boolean;
}

/** How long a source's schema is cached, like the ES|QL editor's fields cache: new fields show up without a reload. */
export const ESQL_SOURCE_INFO_CACHE_TTL = 10 * 60 * 1000;

const sourceInfoCache = new LRUCache<string, SourceInfoRequest>({
  max: 100,
  ttl: ESQL_SOURCE_INFO_CACHE_TTL,
});

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
  // Use one representation for no variables in both source IDs and cache keys.
  const cleanVariables = esqlVariables?.length
    ? esqlVariables.map(({ key, value, type }) => ({ key, value, type } as ESQLControlVariable))
    : undefined;
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
  signal,
}: {
  query: string;
  http: HttpStart;
  projectRouting?: string;
  timeRange?: { from: string; to: string };
  timeFieldName?: string;
  esqlVariables?: ESQLControlVariable[];
  /** Stops waiting; the request itself is aborted once all callers sharing it have aborted. */
  signal?: AbortSignal;
}): Promise<ESQLSourceInfo> {
  const { cacheKey, cleanVariables } = buildEsqlSourceCacheKey(
    query,
    projectRouting,
    esqlVariables
  );

  let request = sourceInfoCache.get(cacheKey);
  if (!request) {
    const controller = new AbortController();
    const promise = http
      .post<ESQLSourceInfo>(SOURCE_INFO_ROUTE, {
        body: JSON.stringify({
          query,
          projectRouting,
          timeRange,
          timeFieldName,
          esqlVariables: cleanVariables,
        }),
        signal: controller.signal,
      })
      .then((info) => {
        // Query errors are answered with 200 to keep the console clean; still fail, uncached.
        if (info.error) {
          throw new Error(info.error.message);
        }
        return info;
      });
    const newRequest: SourceInfoRequest = { promise, controller, waiters: 0, settled: false };
    promise.then(
      () => {
        newRequest.settled = true;
      },
      () => {
        newRequest.settled = true;
        if (sourceInfoCache.get(cacheKey) === newRequest) {
          sourceInfoCache.delete(cacheKey);
        }
      }
    );
    sourceInfoCache.set(cacheKey, newRequest);
    request = newRequest;
  }

  return waitForRequest(request, cacheKey, signal);
}

function waitForRequest(
  request: SourceInfoRequest,
  cacheKey: string,
  signal: AbortSignal | undefined
): Promise<ESQLSourceInfo> {
  request.waiters++;
  if (!signal) {
    return request.promise;
  }

  const release = () => {
    request.waiters--;
    if (request.waiters === 0 && !request.settled) {
      request.controller.abort();
      if (sourceInfoCache.get(cacheKey) === request) {
        sourceInfoCache.delete(cacheKey);
      }
    }
  };

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      release();
      reject(new DOMException('The request was aborted', 'AbortError'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    request.promise.then(
      (info) => {
        signal.removeEventListener('abort', onAbort);
        resolve(info);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}
