/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../item';

/**
 * Include/exclude filter shape used by `tag`, and plugin-provided `custom` filter dimensions.
 */
export interface IncludeExcludeFilter {
  /** Values that items must match (include filter). */
  include?: string[];
  /** Values that items must not match (exclude filter). */
  exclude?: string[];
}

/** Filter dimension key for tag-based filtering. Matches the `fieldName` used in tag filter popovers. */
export const TAG_FILTER_ID = 'tag';

/**
 * User filter state for creator-based filtering.
 *
 * Separates UI-driven selections (popover / avatar clicks) from text-driven
 * query bar clauses so they can be managed independently:
 *
 * - `uid` holds UIDs resolved from email or sentinel values selected through UI controls.
 *   The {@link CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER} action checks this array to
 *   decide whether to add or remove an email from the query bar.
 * - `query` maps raw text values typed in the query bar (e.g. `createdBy:"Jane Doe"`)
 *   to the UIDs they resolve to. Text clauses are "sticky" — only removed by manually
 *   editing the query bar or clearing all filters.
 *
 * Client-side filtering uses the deduplicated union of all UIDs from both fields.
 */
export interface UserFilter {
  /** UIDs resolved from email or sentinel values selected via UI controls. */
  uid: string[];
  /**
   * Text-driven query values mapped to their resolved UIDs.
   *
   * Keys are the raw text values from `createdBy:` clauses (names, usernames, etc.).
   * Values are arrays of UIDs that each text value resolved to.
   * E.g. `{ "Jane Doe": ["uid123", "uid456"], "clint": ["uid789"] }`.
   */
  query: Record<string, string[]>;
}

/**
 * Active filters applied to the content list.
 *
 * Each built-in filter dimension (`search`, `tag`, `user`) has an explicit,
 * precisely-typed field. Plugin-provided filter dimensions (e.g. `type`,
 * `lastResponse`) live under the `custom` record.
 */
export interface ActiveFilters {
  /** Search text extracted from the search bar, without filter syntax. */
  search?: string;
  /** When `true`, restrict results to starred items only. */
  starredOnly?: boolean;
  /** Tag include/exclude filter. */
  tag?: IncludeExcludeFilter;
  /** User filter for creator-based filtering. Applied client-side; never sent to the server. */
  user?: UserFilter;
  /** Plugin-provided filter dimensions keyed by their `fieldName`. */
  custom?: Record<string, IncludeExcludeFilter | undefined>;
}

/**
 * Narrows a filter value to {@link IncludeExcludeFilter} if it is one; otherwise returns `undefined`.
 */
export const getIncludeExcludeFilter = (
  value: IncludeExcludeFilter | undefined
): IncludeExcludeFilter | undefined => (value && typeof value === 'object' ? value : undefined);

/**
 * Per-value counts for a single filter dimension.
 */
export type FilterCounts = Record<string, number>;

/**
 * Parameters for the `findItems` function.
 */
export interface FindItemsParams {
  /**
   * Search query text with filter syntax already extracted.
   *
   * This is a convenience alias for `filters.search ?? ''`. When building
   * queries, prefer this over accessing `filters.search` directly.
   */
  searchQuery: string;

  /** Active filters (includes the raw `search` text and any structured filters). */
  filters: ActiveFilters;

  /**
   * Sort configuration.
   *
   * When sorting is disabled via `features.sorting: false`, this will be `undefined`.
   * Implementations should return items in their natural order (e.g., server default).
   */
  sort?: {
    /** Field name to sort by. */
    field: string;
    /** Sort direction. */
    direction: 'asc' | 'desc';
  };

  /** Pagination configuration. */
  page: {
    /** Zero-based page index. */
    index: number;
    /** Number of items per page. */
    size: number;
  };

  /** AbortSignal for request cancellation. */
  signal?: AbortSignal;
}

/**
 * Result from the `findItems` function.
 */
export interface FindItemsResult {
  /** Items for the current page. */
  items: ContentListItem[];

  /** Total matching items for pagination. */
  total: number;

  /**
   * Optional per-filter counts, indexed by filter identifier.
   *
   * Each key (e.g. `tag`, `type`, `lastResponse`) maps to a `Record<string, number>` of
   * value → count for the full result set (not just the current page). When present for a
   * filter, the corresponding filter popover displays counts next to each option.
   *
   * Client-side data sources that iterate the full item set before paginating can compute
   * this cheaply. Server-side data sources should omit entries unless they can retrieve
   * counts via an aggregation query.
   */
  counts?: Record<string, FilterCounts>;
}

/**
 * Function signature for fetching items from a data source.
 */
export type FindItemsFn = (params: FindItemsParams) => Promise<FindItemsResult>;

/**
 * Data source configuration properties.
 */
export interface DataSourceConfig {
  /** Fetches items from the data source. */
  findItems: FindItemsFn;

  /** Called after successful fetch. */
  onFetchSuccess?: (result: FindItemsResult) => void;
}
