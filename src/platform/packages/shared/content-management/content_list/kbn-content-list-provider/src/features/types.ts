/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortingConfig } from './sorting';
import type { PaginationConfig } from './pagination';
import type { SearchConfig } from './search';
import type { ActiveFilters } from '../datasource';

/**
 * A single display-ready facet for a filter popover option.
 *
 * @template T - Additional data associated with the facet (e.g. avatar info, tag color).
 */
export interface FilterFacet<T = Record<string, unknown>> {
  /** Unique key identifying this facet (e.g. user UID, tag ID). */
  key: string;
  /** Human-readable display label. */
  label: string;
  /** Optional item count for this facet value. */
  count?: number;
  /** Optional additional data (e.g. `{ user, avatar }` for profiles, `{ color }` for tags). */
  data?: T;
}

/**
 * Parameters passed to {@link FilterFeatureConfig.getMetadata}.
 */
export interface FilterMetadataParams {
  /** Current active filters (excluding the filter being fetched, for faceted-search semantics). */
  filters: ActiveFilters;
  /** Abort signal for request cancellation. */
  signal?: AbortSignal;
}

/**
 * Configuration for a filter feature that provides popover metadata.
 *
 * How the implementation accesses the item set is provider-specific:
 * - Client provider: captures `getItems()` from the strategy via closure.
 * - Server provider: calls a server aggregation endpoint, ignoring items.
 */
export interface FilterFeatureConfig {
  /**
   * Fetch display-ready facets for the filter popover.
   * Called lazily when the popover opens, with its own React Query lifecycle.
   */
  getMetadata: (params: FilterMetadataParams) => Promise<FilterFacet[]>;
}

/**
 * Type guard to check if a filter feature config is a {@link FilterFeatureConfig} object (not boolean).
 */
export const isFilterFeatureConfig = (
  value?: boolean | FilterFeatureConfig
): value is FilterFeatureConfig => typeof value === 'object' && value !== null;

/**
 * Feature configuration for enabling/customizing content list capabilities.
 */
export interface ContentListFeatures {
  /** Sorting configuration. */
  sorting?: SortingConfig | boolean;
  /** Pagination configuration. Set to `false` to disable pagination entirely. */
  pagination?: PaginationConfig | boolean;
  /** Search configuration. */
  search?: SearchConfig | boolean;
  /**
   * Selection configuration.
   * When `true` (default), row selection checkboxes are shown and bulk
   * actions are enabled. Set to `false` to disable selection entirely.
   * Selection is automatically disabled when `isReadOnly` is `true`.
   */
  selection?: boolean;
  /**
   * Tags feature configuration.
   *
   * - `true` or `undefined`: Auto-enabled when `services.tags` is provided.
   * - `false`: Explicitly disables tags even if `services.tags` is present.
   * - `FilterFeatureConfig`: Enables tags with popover metadata from `getMetadata`.
   */
  tags?: boolean | FilterFeatureConfig;

  /**
   * Starred feature configuration.
   *
   * - `true` or `undefined`: Auto-enabled when `services.favorites` is provided.
   * - `false`: Explicitly disables starring even if `services.favorites` is present.
   */
  starred?: boolean;

  /**
   * CreatedBy feature configuration.
   *
   * - `true` or `undefined`: Auto-enabled when `services.userProfile` is provided.
   * - `false`: Explicitly disables created-by column and filter even if the service is present.
   * - `FilterFeatureConfig`: Enables created-by with popover metadata from `getMetadata`.
   */
  createdBy?: boolean | FilterFeatureConfig;
}

/**
 * Type guard to check if sorting config is a {@link SortingConfig} object (not boolean).
 */
export const isSortingConfig = (sorting?: SortingConfig | boolean): sorting is SortingConfig => {
  return typeof sorting === 'object' && sorting !== null;
};

/**
 * Type guard to check if pagination config is a {@link PaginationConfig} object (not boolean).
 */
export const isPaginationConfig = (
  pagination?: PaginationConfig | boolean
): pagination is PaginationConfig => {
  return typeof pagination === 'object' && pagination !== null;
};

/**
 * Type guard to check if search config is a {@link SearchConfig} object (not boolean).
 */
export const isSearchConfig = (search: ContentListFeatures['search']): search is SearchConfig => {
  return typeof search === 'object' && search !== null;
};

/**
 * Resolved feature support flags.
 *
 * These flags represent the **effective** availability of features after evaluating:
 * - Explicit configuration (e.g., `features.sorting: true` or `features.sorting: { ... }`)
 * - Implicit enablement (e.g., providing required services enabling a feature)
 * - Explicit disablement (e.g., `features.sorting: false` overrides defaults)
 * - Implicit disablement (e.g., missing services)
 *
 * Use these flags to conditionally render UI elements or enable functionality based on
 * what's actually available, rather than checking raw configuration values.
 *
 * @example
 * ```tsx
 * const { supports } = useContentListConfig();
 *
 * return (
 *   <div>
 *     {supports.sorting && <SortDropdown />}
 *     {supports.tags && <TagFilter />}
 *   </div>
 * );
 * ```
 */
export interface ContentListSupports {
  /** Whether sorting is supported. */
  sorting: boolean;
  /** Whether pagination is supported. */
  pagination: boolean;
  /** Whether search is supported. */
  search: boolean;
  /** Whether item selection and bulk actions are supported. */
  selection: boolean;
  /** Whether tags filtering and display is supported. */
  tags: boolean;
  /** Whether starring items is supported. */
  starred: boolean;
  /** Whether created-by column and user filtering is supported. */
  createdBy: boolean;
}
