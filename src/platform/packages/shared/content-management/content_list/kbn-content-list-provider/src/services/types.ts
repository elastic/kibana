/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import type { UserProfileService } from './user_profile';

/**
 * Services provided to the content list provider to enable additional capabilities.
 *
 * Each service follows a pattern where providing the service enables the corresponding
 * feature by default. Features can be explicitly disabled via the `features` prop
 * even when the service is present.
 */
export interface ContentListServices {
  /**
   * Tags service for tag-based filtering and display.
   *
   * Uses the standard `ContentManagementTagsServices` interface from `@kbn/content-management-tags`.
   * Provides `getTagList` for listing available tags and optionally `parseSearchQuery`
   * for extracting tag filters from the search bar query text.
   */
  tags?: ContentManagementTagsServices;

  /**
   * Favorites service for starring items.
   *
   * Uses the `FavoritesClientPublic` interface from `@kbn/content-management-favorites-public`.
   * When provided, enables the starred feature (star button in table rows, starred
   * filter in toolbar) unless explicitly disabled via `features.starred: false`.
   */
  favorites?: FavoritesClientPublic;

  /**
   * User profile service for creator-based filtering and display.
   *
   * When provided, enables the "Created by" column and filter
   * unless explicitly disabled via `features.createdBy: false`.
   */
  userProfile?: UserProfileService;
}
