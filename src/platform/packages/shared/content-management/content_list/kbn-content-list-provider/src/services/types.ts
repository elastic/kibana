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
import type { UserProfileUserInfo, UserProfileAvatarData } from '@kbn/user-profile-components';

/**
 * A user profile entry for filtering and display.
 *
 * Carries the full {@link UserProfileUserInfo} and optional {@link UserProfileAvatarData}
 * so that consumers (e.g. table cells) can use `UserAvatarTip` from
 * `@kbn/user-profile-components` without issuing their own per-row fetches.
 *
 * The `email` and `fullName` convenience fields exist for query-bar resolution
 * (display↔ID mapping in {@link FieldDefinition}) and are derived from `user`.
 */
export interface UserProfileEntry {
  /** Internal user ID. */
  uid: string;
  /** Full Kibana user info (username, email, full_name). */
  user: UserProfileUserInfo;
  /** Optional avatar data (image URL, custom initials/color). */
  avatar?: UserProfileAvatarData;
  /**
   * Convenience alias for `user.email ?? ''`.
   * Used by query-bar display↔ID resolution.
   */
  email: string;
  /**
   * Convenience alias for `user.full_name ?? user.username`.
   * Used by query-bar display↔ID resolution.
   */
  fullName: string;
}

/**
 * User profiles service for user-based filtering (createdBy, updatedBy, etc.).
 *
 * Provides async methods for fetching user profiles. The provider manages
 * a shared {@link ProfileCache} so that all consumers (field definitions,
 * filter popovers, table cells) read synchronously from a single cache.
 */
export interface ContentListUserProfilesServices {
  /** Resolve specific UIDs to profiles (for on-demand loading). */
  bulkResolve: (uids: string[]) => Promise<UserProfileEntry[]>;
}

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
   * User profiles service for user-based filtering.
   *
   * When provided, enables the `createdBy` filter (and future `updatedBy`, `owner`,
   * etc.) unless explicitly disabled via `features.userProfiles: false`.
   */
  userProfiles?: ContentListUserProfilesServices;
}
