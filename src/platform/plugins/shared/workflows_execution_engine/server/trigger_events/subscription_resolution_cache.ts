/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Upper bound on cached space+trigger entries. Eviction drops the oldest key. */
export const DEFAULT_SUBSCRIPTION_CACHE_MAX_ENTRIES = 1000;

const KEY_SEPARATOR = '\0';

export interface SubscriptionCacheGroup {
  condition: string;
  workflowIds: readonly string[];
  connectorId?: string;
}

export interface SubscriptionCacheEntry {
  expiresAt: number;
  groups: readonly SubscriptionCacheGroup[];
}

export type SubscriptionCacheOutcome = 'hit' | 'miss';

export interface SubscriptionCacheLoadResult {
  outcome: SubscriptionCacheOutcome;
  entry: SubscriptionCacheEntry;
}

export interface InvalidateSubscriptionCacheParams {
  spaceId: string;
  triggerIds: readonly string[];
  allSpaces?: boolean;
}

export interface SubscriptionResolutionCacheOptions {
  ttlMs: number;
  maxEntries?: number;
  now?: () => number;
}

const cacheKey = (spaceId: string, triggerId: string): string =>
  `${spaceId}${KEY_SEPARATOR}${triggerId}`;

const splitKey = (key: string): { spaceId: string; triggerId: string } => {
  const separatorIndex = key.indexOf(KEY_SEPARATOR);
  return {
    spaceId: key.slice(0, separatorIndex),
    triggerId: key.slice(separatorIndex + 1),
  };
};

const copyGroups = (groups: readonly SubscriptionCacheGroup[]): SubscriptionCacheGroup[] =>
  groups.map((group) => ({
    condition: group.condition,
    workflowIds: [...group.workflowIds],
    ...(group.connectorId !== undefined ? { connectorId: group.connectorId } : {}),
  }));

const copyEntry = (entry: SubscriptionCacheEntry): SubscriptionCacheEntry => ({
  expiresAt: entry.expiresAt,
  groups: copyGroups(entry.groups),
});

/**
 * Process-local subscriber cache keyed by space and trigger.
 * A hit does not move `expiresAt`. Entries are not shared across Kibana nodes.
 */
export class SubscriptionResolutionCache {
  private readonly entries = new Map<string, SubscriptionCacheEntry>();
  private readonly generations = new Map<string, number>();
  private readonly inflight = new Map<string, Promise<SubscriptionCacheEntry>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: SubscriptionResolutionCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.maxEntries = options.maxEntries ?? DEFAULT_SUBSCRIPTION_CACHE_MAX_ENTRIES;
    this.now = options.now ?? (() => Date.now());
  }

  /** Returns the unexpired entry. Drops the entry when `expiresAt` has passed. */
  read(spaceId: string, triggerId: string): SubscriptionCacheEntry | undefined {
    return this.readKey(cacheKey(spaceId, triggerId));
  }

  /**
   * Returns the cached groups, loading them when the entry is missing or expired.
   * Concurrent loads for the same key share one fetch. The result is stored only
   * when the key has not been invalidated since the fetch started.
   */
  async load(
    spaceId: string,
    triggerId: string,
    fetchGroups: () => Promise<readonly SubscriptionCacheGroup[]>
  ): Promise<SubscriptionCacheLoadResult> {
    const key = cacheKey(spaceId, triggerId);
    const cached = this.readKey(key);
    if (cached) {
      return { outcome: 'hit', entry: cached };
    }

    const pending = this.inflight.get(key);
    if (pending) {
      const entry = await pending;
      return { outcome: 'miss', entry: copyEntry(entry) };
    }

    const generationAtStart = this.generationOf(key);
    const loading = this.fetchAndMaybeStore(key, generationAtStart, fetchGroups);
    this.inflight.set(key, loading);
    try {
      const entry = await loading;
      return { outcome: 'miss', entry: copyEntry(entry) };
    } finally {
      if (this.inflight.get(key) === loading) {
        this.inflight.delete(key);
      }
    }
  }

  /** Drops the space+trigger entries. `allSpaces` drops the trigger id in every cached space. */
  invalidate(params: InvalidateSubscriptionCacheParams): void {
    for (const triggerId of params.triggerIds) {
      if (params.allSpaces) {
        this.dropTriggerEverywhere(triggerId);
      } else {
        this.dropKey(cacheKey(params.spaceId, triggerId));
      }
    }
  }

  /** Drops every cached entry. */
  invalidateAll(): void {
    const keys = new Set<string>([...this.entries.keys(), ...this.inflight.keys()]);
    for (const key of keys) {
      this.bump(key);
    }
    this.entries.clear();
    this.inflight.clear();
  }

  private readKey(key: string): SubscriptionCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (this.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return copyEntry(entry);
  }

  private async fetchAndMaybeStore(
    key: string,
    generationAtStart: number,
    fetchGroups: () => Promise<readonly SubscriptionCacheGroup[]>
  ): Promise<SubscriptionCacheEntry> {
    const groups = await fetchGroups();
    const entry: SubscriptionCacheEntry = {
      expiresAt: this.now() + this.ttlMs,
      groups: copyGroups(groups),
    };
    if (this.generationOf(key) === generationAtStart) {
      this.write(key, entry);
    }
    return entry;
  }

  private write(key: string, entry: SubscriptionCacheEntry): void {
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.entries.delete(oldest);
    }
    this.entries.set(key, entry);
  }

  private dropTriggerEverywhere(triggerId: string): void {
    const keys = new Set<string>([
      ...this.entries.keys(),
      ...this.inflight.keys(),
      ...this.generations.keys(),
    ]);
    for (const key of keys) {
      if (splitKey(key).triggerId === triggerId) {
        this.dropKey(key);
      }
    }
  }

  private dropKey(key: string): void {
    this.bump(key);
    this.entries.delete(key);
    this.inflight.delete(key);
  }

  private generationOf(key: string): number {
    return this.generations.get(key) ?? 0;
  }

  private bump(key: string): void {
    this.generations.set(key, this.generationOf(key) + 1);
  }
}
