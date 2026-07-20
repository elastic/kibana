/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import {
  FavoritesClient,
  type FavoritesClientPublic,
} from '@kbn/content-management-favorites-public';

/**
 * Options for {@link createFavoritesService}.
 */
export interface FavoritesServiceOptions {
  /**
   * Application identifier reported to the favorites usage collector
   * (e.g. `'dashboards'`, `'visualize'`).
   */
  appId: string;
  /** Saved object type that owns the favorited items (e.g. `'dashboard'`). */
  savedObjectType: string;
  /** Core HTTP service. */
  http: HttpStart;
  /** Core user-profile service — required to gate per-user availability. */
  userProfile: UserProfileServiceStart;
  /** Optional usage collection start, used to record click events. */
  usageCollection?: UsageCollectionStart;
}

/**
 * Build a favorites service for `ContentListClientProvider`'s
 * `services.favorites` slot from the standard core services.
 *
 * Returns the upstream {@link FavoritesClient} typed as
 * {@link FavoritesClientPublic} so consumers can substitute their own
 * implementation if needed.
 *
 * @example
 * ```ts
 * const favorites = createFavoritesService({
 *   appId: 'dashboards',
 *   savedObjectType: 'dashboard',
 *   http: coreServices.http,
 *   userProfile: coreServices.userProfile,
 *   usageCollection: usageCollectionService,
 * });
 * ```
 */
export const createFavoritesService = <Metadata extends object | void = void>({
  appId,
  savedObjectType,
  http,
  userProfile,
  usageCollection,
}: FavoritesServiceOptions): FavoritesClientPublic<Metadata> =>
  new FavoritesClient<Metadata>(appId, savedObjectType, {
    http,
    userProfile,
    usageCollection,
  });
