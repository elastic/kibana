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
 * Active filters applied to the content list.
 */
export interface ActiveFilters {
  /** Search text extracted from the search bar, without filter syntax. */
  search?: string;
}

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
