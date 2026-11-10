/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AbsoluteTimeRange } from '@kbn/es-query';
import type { PublicContract } from '@kbn/utility-types';

export interface ReplayCacheEntry {
  readonly sessionId: string;
  readonly timeRange: AbsoluteTimeRange;
  /**
   * Context the app requires to match before replaying, e.g. the time picker selection kept
   * relative (`now-1h`), pinned filters and project routing.
   */
  readonly contextKey: string;
}

export type ReplayCacheResult =
  | { hit: false }
  | {
      hit: true;
      sessionId: string;
      timeRange: AbsoluteTimeRange;
      lastFetched: string;
    };

interface ReplayCacheOptions {
  hasSession: (sessionId: string) => boolean;
  hasResponseCacheForSession: (sessionId: string) => boolean;
  evictResponseCacheForSession: (sessionId: string) => void;
}

export type ReplayCacheContract = PublicContract<ReplayCache>;

/** Associates assets with compatible cached search sessions and their original time ranges. */
export class ReplayCache {
  private readonly entries = new Map<string, ReplayCacheEntry & { readonly lastFetched: string }>();

  constructor(private readonly options: ReplayCacheOptions) {}

  /** Returns a compatible, available loading context without modifying the cache. */
  public get(assetId: string, contextKey: string): ReplayCacheResult {
    const entry = this.entries.get(assetId);
    if (!entry) return { hit: false };

    const { hasSession, hasResponseCacheForSession } = this.options;
    const { sessionId, timeRange, lastFetched, contextKey: cachedContextKey } = entry;

    if (
      cachedContextKey !== contextKey ||
      !hasSession(sessionId) ||
      !hasResponseCacheForSession(sessionId)
    ) {
      return { hit: false };
    }

    return { hit: true, sessionId, timeRange: { ...timeRange }, lastFetched };
  }

  /** Stores an asset's loading context and evicts any responses from its previous registration. */
  public set(assetId: string, entry: ReplayCacheEntry): void {
    const { hasSession } = this.options;
    const { timeRange } = entry;

    for (const [cachedAssetId, { sessionId: cachedSessionId }] of this.entries) {
      if (!hasSession(cachedSessionId)) {
        this.delete(cachedAssetId);
      }
    }

    const previousEntry = this.entries.get(assetId);
    if (previousEntry) {
      this.delete(assetId);
    }

    this.entries.set(assetId, {
      ...entry,
      timeRange: { ...timeRange },
      lastFetched: new Date().toISOString(),
    });
  }

  /** Removes an asset's loading context and its cached responses. */
  public delete(assetId: string): void {
    const entry = this.entries.get(assetId);
    if (!entry) return;

    const { evictResponseCacheForSession } = this.options;
    const { sessionId } = entry;
    this.entries.delete(assetId);
    evictResponseCacheForSession(sessionId);
  }

  /** Removes all registered assets and their cached responses. */
  public clear(): void {
    for (const assetId of this.entries.keys()) {
      this.delete(assetId);
    }
  }
}
