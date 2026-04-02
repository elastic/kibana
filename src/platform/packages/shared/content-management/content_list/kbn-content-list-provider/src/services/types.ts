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

/**
 * A user profile entry for filtering and display.
 */
export interface UserProfileEntry {
  /** Internal user ID. */
  uid: string;
  /** User's email address (display value in query text). */
  email: string;
  /** User's full display name. */
  fullName: string;
}

/**
 * User profiles service for user-based filtering (createdBy, updatedBy, etc.).
 *
 * Provides async methods for fetching user profiles. The provider manages
 * a shared {@link UserProfileStore} cache so that all consumers (field definitions,
 * filter popovers, table cells) read synchronously from a single store.
 */
export interface ContentListUserProfilesServices {
  /** Resolve specific UIDs to profiles (for on-demand loading). */
  bulkResolve: (uids: string[]) => Promise<UserProfileEntry[]>;
  /**
   * Search for user profiles by name, email, or username.
   *
   * Called when the query bar contains a `createdBy:` value that can't be
   * resolved from the local cache (e.g. a typed or URL-driven email).
   * The store merges results into its cache so subsequent resolution
   * succeeds synchronously.
   *
   * Optional — when absent, unresolved display values remain unresolved
   * until the profile is loaded by another path (item fetch, popover open).
   */
  suggest?: (query: string) => Promise<UserProfileEntry[]>;
}

/**
 * Shared, synchronous read interface for cached user profile data.
 *
 * Populated asynchronously via the {@link ContentListUserProfilesServices} methods,
 * then consumed synchronously by field definitions, table cells, and filter popovers.
 */
export interface UserProfileStore {
  /** Get all cached profiles. */
  getAll: () => UserProfileEntry[];
  /** Look up a single profile by UID (returns `undefined` if not yet cached). */
  resolve: (uid: string) => UserProfileEntry | undefined;
  /** Ensure the given UIDs are in the cache (fetches any missing ones). */
  ensureLoaded: (uids: string[]) => Promise<void>;
  /**
   * Merge already-resolved profiles into the cache without a network call.
   *
   * Useful when profiles have been fetched through a different path (e.g.
   * `FilterFacetConfig.getFacets`) and should be available for synchronous
   * lookups via `resolve`/`getAll` and for `resolveDisplayValues` cache checks.
   */
  merge: (entries: UserProfileEntry[]) => void;
  /**
   * Resolve display values (emails, names) that aren't in the cache.
   *
   * Uses the `suggest` service method to search for profiles by the given
   * display strings. Results are merged into the cache. No-op when the
   * `suggest` service method is not available.
   */
  resolveDisplayValues: (displayValues: string[]) => Promise<void>;
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
