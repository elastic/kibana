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
import type { ActiveFilters } from '../features/filtering';

/**
 * Maps raw filter inputs to their resolved canonical values.
 * Used by clients to build bidirectional mappings for deduplication.
 */
export interface ResolvedFilters {
  /** Maps raw createdBy inputs to resolved user profile UIDs. */
  createdBy?: Record<string, string>;
}

/**
 * Parameters for the `findItems` function.
 */
export interface FindItemsParams {
  /** The search query text (with filter syntax already extracted). */
  searchQuery: string;
  /** Active filters including tags, users, starred, and custom filters. */
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
 * @template T The item type being listed.
 */
export interface FindItemsResult<T = UserContentCommonSchema> {
  /** Array of items for the current page. */
  items: T[];
  /** Total number of items matching the query (for pagination). */
  total: number;
  /** Maps raw filter inputs to their resolved canonical values. */
  resolvedFilters?: ResolvedFilters;
}

/**
 * Function signature for fetching items from a data source.
 * @template T The raw item type from the datasource.
 */
export type FindItemsFn<T = UserContentCommonSchema> = (
  params: FindItemsParams
) => Promise<FindItemsResult<T>>;

/**
 * Base data source properties shared by all variants.
 * @template T The raw item type from the datasource.
 */
interface BaseDataSourceConfig<T = UserContentCommonSchema> {
  /** Callback invoked after successful fetch. */
  onFetchSuccess?: (result: FindItemsResult<T>) => void;

  /**
   * Debounce delay in milliseconds for search queries.
   * Use this to prevent excessive requests while the user is typing.
   *
   * @default 0 (no debounce)
   */
  debounceMs?: number;
}

/**
 * Transform config based on whether T extends UserContentCommonSchema.
 * @template T The raw item type from the datasource.
 */
type TransformConfig<T> = T extends UserContentCommonSchema
  ? {
      /**
       * Transform function to convert raw datasource items (type `T`) into
       * standardized `ContentListItem` format for rendering components.
       *
       * Optional for `UserContentCommonSchema`-compatible types (default transform applies).
       */
      transform?: TransformFunction<T>;
    }
  : {
      /**
       * Transform function to convert raw datasource items (type `T`) into
       * standardized `ContentListItem` format for rendering components.
       *
       * REQUIRED for custom types that don't extend `UserContentCommonSchema`.
       */
      transform: TransformFunction<T>;
    };

/**
 * Data source configuration for fetching items.
 *
 * Provide a `findItems` function that handles data fetching, sorting, filtering,
 * and pagination. The function receives all filter/sort/page parameters and
 * should return the appropriate results from the server.
 *
 * @template T The raw item type from the datasource.
 *
 * @example
 * ```tsx
 * const findItems: FindItemsFn = async ({ searchQuery, filters, sort, page, signal }) => {
 *   const response = await myApi.search({
 *     query: searchQuery,
 *     tags: filters.tags,
 *     starredOnly: filters.starredOnly,
 *     sortField: sort.field,
 *     sortOrder: sort.direction,
 *     page: page.index,
 *     pageSize: page.size,
 *     signal,
 *   });
 *
 *   return {
 *     items: response.items,
 *     total: response.total,
 *   };
 * };
 *
 * <ContentListProvider
 *   entityName="dashboard"
 *   entityNamePlural="dashboards"
 *   dataSource={{ findItems }}
 *   services={services}
 * >
 *   {children}
 * </ContentListProvider>
 * ```
 */
export type DataSourceConfig<T = UserContentCommonSchema> = BaseDataSourceConfig<T> &
  TransformConfig<T> & {
    /** Function to fetch items from the data source. */
    findItems: FindItemsFn<T>;

    /**
     * Optional function to clear internal caches.
     * Called before refetch to ensure fresh data is fetched from the server.
     * This is used by client-side providers that maintain internal caches.
     */
    clearCache?: () => void;
  };

/**
 * Transform configuration type.
 * Exported for use by Kibana providers.
 */
export type { TransformConfig };
