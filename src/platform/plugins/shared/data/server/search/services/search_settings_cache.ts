/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { UI_SETTINGS } from '../../../common';

export interface SearchSettings {
  includeFrozen: boolean;
  maxConcurrentShardRequests: number;
}

const searchSettingsDefaults: SearchSettings = {
  includeFrozen: false, // Deprecated setting, use false as default
  maxConcurrentShardRequests: 0, // use Elasticsearch default by setting to 0
};

/**
 * Caches UI settings used by search strategies.
 * Automatically refreshes at most every 30 seconds to minimize performance overhead.
 */
export class SearchSettingsCache {
  private cache: SearchSettings | null = null;
  private lastRefreshTime: number = 0;
  private readonly MIN_SETTINGS_REFRESH_INTERVAL_MS = 30_000;
  private uiSettings?: CoreStart['uiSettings'];
  private savedObjects?: CoreStart['savedObjects'];
  private refreshPromise: Promise<void> | null = null;

  constructor(private readonly logger: Logger) {}

  /**
   * Initializes the cache by fetching current UI settings.
   * Should be called during service startup.
   */
  public async start(
    uiSettings: CoreStart['uiSettings'],
    savedObjects: CoreStart['savedObjects']
  ): Promise<void> {
    this.uiSettings = uiSettings;
    this.savedObjects = savedObjects;

    await this.refreshCache();
  }

  /**
   * Clears the cache and releases references.
   * Should be called during service shutdown.
   */
  public stop(): void {
    this.cache = null;
    this.lastRefreshTime = 0;
    this.uiSettings = undefined;
    this.savedObjects = undefined;
    this.refreshPromise = null;
  }

  /**
   * Returns the cached search settings, or defaults if cache is not initialized.
   */
  public getSettings(): SearchSettings {
    if (!this.cache) {
      // Fallback if cache not initialized yet
      return searchSettingsDefaults;
    }
    return this.cache;
  }

  /**
   * Refreshes the cache if enough time has passed since the last refresh.
   * This method is safe to call on every search request as it rate-limits itself.
   */
  public maybeRefresh(): void {
    if (!this.uiSettings || !this.savedObjects) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;

    if (timeSinceLastRefresh >= this.MIN_SETTINGS_REFRESH_INTERVAL_MS) {
      this.refreshCache().catch((error) => {
        this.logger.error('Failed to refresh search settings cache on demand', error);
      });
    }
  }

  /**
   * Fetches the current UI settings from the global scope and updates the cache.
   */
  private async refreshCache(): Promise<void> {
    if (!this.uiSettings || !this.savedObjects) {
      throw new Error('Cannot refresh cache: uiSettings or savedObjects not initialized');
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const internalClient = this.savedObjects!.createInternalRepository();
        const globalClient = this.uiSettings!.globalAsScopedToClient(internalClient);

        const [includeFrozen, maxConcurrentShardRequests] = await Promise.all([
          globalClient.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
          globalClient.get<number>(UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS),
        ]);

        this.cache = {
          includeFrozen,
          maxConcurrentShardRequests,
        };

        this.lastRefreshTime = Date.now();

        this.logger.debug(
          `Search settings cache initialized: includeFrozen=${includeFrozen}, maxConcurrentShardRequests=${maxConcurrentShardRequests}`
        );
      } catch (error) {
        this.logger.error('Failed to initialize search settings cache', error);
        // Fallback to defaults
        this.cache = searchSettingsDefaults;
        this.lastRefreshTime = Date.now();
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}
