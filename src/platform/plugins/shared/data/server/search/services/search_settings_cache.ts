/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { LRUCache } from 'lru-cache';
import { UI_SETTINGS } from '../../../common';

export interface SearchSettings {
  includeFrozen: boolean;
  maxConcurrentShardRequests: number;
}

const searchSettingsDefaults: SearchSettings = {
  includeFrozen: false, // Deprecated setting, use false as default
  maxConcurrentShardRequests: 0, // use Elasticsearch default by setting to 0
};

const DEFAULT_SPACE_ID = 'default';
const MAX_SPACES = 100;

interface CacheEntry {
  settings: SearchSettings;
  lastRefreshTime: number;
  refreshPromise: Promise<void> | null;
}

/**
 * Minimal interface for the spaces service. This allows the data plugin
 * to use spaces without having a direct dependency on the spaces plugin.
 */
interface SpacesService {
  getSpaceId(request: KibanaRequest): string;
}

/**
 * Caches UI settings used by search strategies.
 * Automatically refreshes at most every 30 seconds to minimize performance overhead.
 */
export class SearchSettingsCache {
  private cache?: LRUCache<string, CacheEntry>;
  private readonly MIN_SETTINGS_REFRESH_INTERVAL_MS = 30_000;
  private uiSettings?: CoreStart['uiSettings'];
  private savedObjects?: CoreStart['savedObjects'];
  private spacesService?: SpacesService;

  constructor(private readonly logger: Logger) {}

  /**
   * Initializes the cache by fetching current UI settings.
   * Should be called during service startup.
   */
  public async start(
    uiSettings: CoreStart['uiSettings'],
    savedObjects: CoreStart['savedObjects'],
    spacesService?: SpacesService
  ): Promise<void> {
    this.uiSettings = uiSettings;
    this.savedObjects = savedObjects;
    this.spacesService = spacesService;

    this.cache = new LRUCache<string, CacheEntry>({
      max: MAX_SPACES,
      ttl: this.MIN_SETTINGS_REFRESH_INTERVAL_MS,
    });
  }

  /**
   * Clears the cache and releases references.
   * Should be called during service shutdown.
   */
  public stop(): void {
    this.cache?.clear();
    this.cache = undefined;
    this.uiSettings = undefined;
    this.savedObjects = undefined;
    this.spacesService = undefined;
  }

  /**
   * Returns the cached search settings for the request's space, or defaults if not cached.
   */
  public getSettings(request: KibanaRequest): SearchSettings {
    const spaceId = this.getSpaceId(request);
    const entry = this.cache?.get(spaceId);
    return entry?.settings ?? searchSettingsDefaults;
  }

  /**
   * Refreshes the cache for the request's space if enough time has passed since the last refresh.
   * This method is safe to call on every search request as it rate-limits itself per space.
   */
  public maybeRefresh(request: KibanaRequest): void {
    if (!this.uiSettings || !this.savedObjects) {
      return;
    }

    const spaceId = this.getSpaceId(request);
    const entry = this.cache?.get(spaceId);
    const now = Date.now();
    const timeSinceLastRefresh = entry ? now - entry.lastRefreshTime : Infinity;

    if (timeSinceLastRefresh >= this.MIN_SETTINGS_REFRESH_INTERVAL_MS) {
      this.refreshCache(request, spaceId).catch((error) => {
        this.logger.error(`Failed to refresh search settings cache for space ${spaceId}`, error);
      });
    }
  }

  /**
   * Extracts the space ID from the request, or returns default space if spaces plugin unavailable.
   */
  private getSpaceId(request: KibanaRequest): string {
    if (!this.spacesService) {
      return DEFAULT_SPACE_ID;
    }
    return this.spacesService.getSpaceId(request);
  }

  /**
   * Fetches the current UI settings for the given space and updates the cache.
   */
  private async refreshCache(request: KibanaRequest, spaceId: string): Promise<void> {
    if (!this.uiSettings || !this.savedObjects || !this.cache) {
      throw new Error('Cannot refresh cache: uiSettings, savedObjects, or cache not initialized');
    }

    // Check for in-flight promise for this space
    const existingEntry = this.cache.get(spaceId);
    if (existingEntry?.refreshPromise) {
      return existingEntry.refreshPromise;
    }

    const refreshPromise = (async () => {
      try {
        const savedObjectsClient = this.savedObjects!.getScopedClient(request);
        const scopedClient = this.uiSettings!.asScopedToClient(savedObjectsClient);

        const [includeFrozen, maxConcurrentShardRequests] = await Promise.all([
          scopedClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
          scopedClient.get<number>(UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS),
        ]);

        const settings = {
          includeFrozen,
          maxConcurrentShardRequests,
        };

        const entry: CacheEntry = {
          settings,
          lastRefreshTime: Date.now(),
          refreshPromise: null,
        };

        this.cache!.set(spaceId, entry);

        this.logger.debug(
          `Search settings cache refreshed for space ${spaceId}: includeFrozen=${includeFrozen}, maxConcurrentShardRequests=${maxConcurrentShardRequests}`
        );
      } catch (error) {
        this.logger.error(`Failed to refresh search settings cache for space ${spaceId}`, error);
        // Fallback to defaults
        const entry: CacheEntry = {
          settings: searchSettingsDefaults,
          lastRefreshTime: Date.now(),
          refreshPromise: null,
        };
        this.cache!.set(spaceId, entry);
      }
    })();

    // Store the promise in the cache entry to deduplicate concurrent refreshes
    const tempEntry: CacheEntry = existingEntry
      ? { ...existingEntry, refreshPromise }
      : {
          settings: searchSettingsDefaults,
          lastRefreshTime: 0,
          refreshPromise,
        };

    this.cache.set(spaceId, tempEntry);

    return refreshPromise;
  }
}
