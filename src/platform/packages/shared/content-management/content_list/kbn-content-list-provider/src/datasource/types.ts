/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { TransformFunction } from '../item';

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
  /** Search query text with filter syntax already extracted. */
  searchQuery: string;

  /** Active filters. */
  filters: ActiveFilters;

  /** Sort configuration. */
  sort: {
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
export interface FindItemsResult<T = UserContentCommonSchema> {
  /** Items for the current page. */
  items: T[];

  /** Total matching items for pagination. */
  total: number;
}

/**
 * Function signature for fetching items from a data source.
 */
export type FindItemsFn<T = UserContentCommonSchema> = (
  params: FindItemsParams
) => Promise<FindItemsResult<T>>;

/**
 * Base data source configuration properties.
 */
interface BaseDataSourceConfig<T = UserContentCommonSchema> {
  /** Fetches items from the data source. */
  findItems: FindItemsFn<T>;

  /** Called after successful fetch. */
  onFetchSuccess?: (result: FindItemsResult<T>) => void;

  /** Clears internal caches before refetch. */
  clearCache?: () => void;
}

/** Transform config with optional `transform` for `UserContentCommonSchema` types. */
interface OptionalTransformConfig<T> {
  /** Converts raw items to `ContentListItem` format. */
  transform?: TransformFunction<T>;
}

/** Transform config with required `transform` for custom item types. */
interface RequiredTransformConfig<T> {
  /** Converts raw items to `ContentListItem` format. */
  transform: TransformFunction<T>;
}

/**
 * Data source configuration for fetching and transforming items.
 *
 * `transform` is optional for `UserContentCommonSchema` types, required otherwise.
 *
 * @example
 * ```ts
 * // Items matching `UserContentCommonSchema` — transform is optional.
 * const simpleDataSource: DataSourceConfig = {
 *   findItems: async ({ searchQuery, sort, page, signal }) => {
 *     const response = await api.search({ query: searchQuery, sort, page, signal });
 *     return { items: response.hits, total: response.total };
 *   },
 * };
 *
 * // Custom items — transform is required.
 * interface MyItem {
 *   uuid: string;
 *   name: string;
 * }
 *
 * const customDataSource: DataSourceConfig<MyItem> = {
 *   findItems: async ({ searchQuery }) => {
 *     const response = await api.search(searchQuery);
 *     return { items: response.results, total: response.count };
 *   },
 *   transform: (item) => ({
 *     id: item.uuid,
 *     title: item.name,
 *     type: 'my-type',
 *   }),
 * };
 * ```
 */
export type DataSourceConfig<T = UserContentCommonSchema> = BaseDataSourceConfig<T> &
  (T extends UserContentCommonSchema ? OptionalTransformConfig<T> : RequiredTransformConfig<T>);
