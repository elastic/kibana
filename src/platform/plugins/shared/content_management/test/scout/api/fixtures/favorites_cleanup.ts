/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout';
import { FAVORITES_API_PATH, INTERNAL_HEADERS } from './constants';

interface FavoriteCleanupTarget {
  readonly favoriteType: string;
  readonly favoriteId: string;
  readonly cookieHeader: Record<string, string>;
  readonly spaceId?: string;
}

/**
 * Tracks favorites owned by one spec and removes only those IDs after each test.
 */
export class FavoritesCleanup {
  private targets: FavoriteCleanupTarget[] = [];

  public track(target: FavoriteCleanupTarget): void {
    this.targets.push(target);
  }

  public async cleanup(apiClient: ApiClientFixture): Promise<void> {
    const targets = this.targets;
    this.targets = [];
    const failures: Error[] = [];

    for (const { favoriteType, favoriteId, cookieHeader, spaceId } of targets) {
      try {
        const spacePath = spaceId ? `s/${spaceId}/` : '';
        const response = await apiClient.post(
          `${spacePath}${FAVORITES_API_PATH}/${favoriteType}/${favoriteId}/unfavorite`,
          { headers: { ...INTERNAL_HEADERS, ...cookieHeader } }
        );

        if (response.statusCode !== 200) {
          failures.push(
            new Error(
              `Failed to clean up favorite ${favoriteType}/${favoriteId}: ${response.statusCode}`
            )
          );
        }
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Favorites cleanup failed');
    }
  }
}
