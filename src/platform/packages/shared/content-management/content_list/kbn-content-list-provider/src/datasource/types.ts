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
 * Include/exclude filter shape used by tag, type, lastResponse, and other filter dimensions.
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
 * Active filters applied to the content list.
 *
 * Filter dimensions (e.g. `tag`, `type`, `lastResponse`) are keyed by their
 * `fieldName` and hold an {@link IncludeExcludeFilter}. The index signature is
 * required to allow arbitrary filter dimensions, but note:
 *
 * - The `search` key is always `string | undefined` — access it directly.
 * - All other keys return `IncludeExcludeFilter | string | undefined`; use
 *   {@link getIncludeExcludeFilter} to safely narrow them to `IncludeExcludeFilter`.
 */
export interface ActiveFilters {
  /** Search text extracted from the search bar, without filter syntax. */
  search?: string;
  [filterId: string]: IncludeExcludeFilter | string | undefined;
}

/**
 * Returns the filter value as `IncludeExcludeFilter` if it is an object; otherwise `undefined`.
 * Use when accessing `include`/`exclude` on a filter dimension, since the index signature allows `string`.
 */
export const getIncludeExcludeFilter = (
  value: IncludeExcludeFilter | string | undefined
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
