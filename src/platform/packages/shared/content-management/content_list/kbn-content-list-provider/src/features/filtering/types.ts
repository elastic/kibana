/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Tag filter structure with include/exclude arrays.
 */
export interface TagFilters {
  /** Tags to include in results (items must have at least one of these tags). */
  include: string[];
  /** Tags to exclude from results (items with these tags are filtered out). */
  exclude: string[];
}

/**
 * Active filter values - tracks currently applied filters.
 *
 * This represents the **runtime state** of filters (what's currently selected/active).
 * Compare with `FilteringConfig` which defines which filters are **available** and their options.
 *
 * Includes known filter types (`tags`, `users`, `starred`) and extensible custom filters.
 *
 * @example
 * ```json
 * {
 *   search: 'foobar',               // Plain text search term (used for highlighting)
 *   tags: {
 *     include: ['urgent', 'bug'],   // Currently filtering TO these tags
 *     exclude: ['archived']         // Currently filtering OUT these tags
 *   },
 *   users: ['alice'],               // Currently filtering by this user
 *   starredOnly: true,              // Starred filter is active
 *   somethingElse: 'active'         // Custom filter value
 * }
 * ```
 */
export interface ActiveFilters {
  /**
   * Plain text search term extracted from the query.
   * This is the search portion without filter syntax (tag:, is:starred, etc.).
   * Used for highlighting matching text in titles and descriptions.
   */
  search?: string;
  /** Tag filters with include and exclude arrays. */
  tags?: TagFilters;
  /** Users to include in results (items must be created by these users). */
  users?: string[];
  /** Whether to only include starred items in results. */
  starredOnly?: boolean;
  /** Allow any additional custom filters */
  [key: string]: unknown;
}

/**
 * Definition for a single custom filter.
 */
export interface CustomFilterDefinition {
  /** Display name for the filter. */
  name: string;
  /** Available options for the filter. */
  options: Array<{ value: unknown; label: string }>;
  /**
   * Whether this filter supports multiple selections.
   *
   * - `false` (default): Single-select mode. Uses simple dropdown with radio-button behavior.
   *   Only one value can be selected at a time (selecting new clears previous).
   *   Filter value appears in the search box as `field:value`.
   *   No exclude support (Cmd+click to exclude is disabled).
   *   Best for exclusive choices (e.g., Status where an item can only be in one state).
   *
   * - `true`: Multi-select mode. Uses checkbox UI with count badge.
   *   Filter values appear in the search box as `field:(value1 OR value2)`.
   *   Supports include/exclude via Cmd+click (like Tags and CreatedBy filters).
   *   Users can type filter syntax directly in the search box.
   *
   * @default false
   */
  multiSelect?: boolean;
}

/**
 * Filtering configuration - defines which filters are available.
 *
 * This represents the **static configuration** of filters (what options exist).
 * Compare with `ActiveFilters` which tracks the **runtime state** (what's currently selected).
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   filtering={{
 *     tags: true,                                          // Enable tags filter (uses service)
 *     users: true,                                         // Enable user filter
 *     starred: true,                                       // Enable starred filter
 *     custom: {
 *       status: {
 *         name: 'Status',
 *         options: [
 *           { value: 'active', label: 'Active' },
 *           { value: 'archived', label: 'Archived' }
 *         ]
 *       }
 *     }
 *   }}
 * />
 * ```
 */
export interface FilteringConfig {
  /** Enable tags filtering. Pass `true` to use the tag service, or provide available tag IDs. */
  tags?: boolean | { available: string[] };
  /** Enable filtering by user who created the item. */
  users?: boolean;
  /** Enable starred filter. */
  starred?: boolean;
  /** Custom filter definitions keyed by field name. */
  custom?: Record<string, CustomFilterDefinition>;
}
