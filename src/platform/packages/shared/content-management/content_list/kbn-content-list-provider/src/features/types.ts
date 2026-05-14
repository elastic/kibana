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
import type { SelectionConfig } from './selection';
import type { ActiveFilters } from '../datasource';
import type { FieldDefinition, FlagDefinition } from '../query_model/types';

/**
 * A single display-ready facet for a filter popover option.
 *
 * The `T` parameter carries provider-specific data through the facet pipeline,
 * e.g. `FilterFacet<Tag>` for tag facets or `FilterFacet<UserProfileEntry>`
 * for user profile facets. Renderers receive the typed `data` without casting.
 */
export interface FilterFacet<T = unknown> {
  /** Unique key identifying this facet (e.g. user UID, tag ID). */
  key: string;
  /** Human-readable display label. */
  label: string;
  /** Optional item count for this facet value. */
  count?: number;
  /** Optional provider-specific data (e.g. `UserProfileEntry` for profiles, `Tag` for tags). */
  data?: T;
}

/**
 * Parameters passed to {@link FilterFacetConfig.getFacets}.
 */
export interface FilterFacetParams {
  /** Current active filters (excluding the filter being fetched, for faceted-search semantics). */
  filters: ActiveFilters;
  /** Abort signal for request cancellation. */
  signal?: AbortSignal;
}

/**
 * Provider that supplies display-ready facets for a filter popover.
 *
 * The `T` parameter flows through to each {@link FilterFacet} returned by
 * `getFacets`, keeping the `data` payload typed end-to-end.
 *
 * How the implementation accesses the item set is provider-specific:
 * - Client provider: captures `getItems()` from the strategy via closure.
 * - Server provider: calls a server aggregation endpoint, ignoring items.
 */
export interface FilterFacetConfig<T = unknown> {
  /**
   * Fetch display-ready facets for the filter popover.
   * Called lazily when the popover opens, with its own React Query lifecycle.
   */
  getFacets: (params: FilterFacetParams) => Promise<FilterFacet<T>[]>;
}

/**
 * Type guard to check if a filter feature config is a {@link FilterFacetConfig} object (not boolean).
 */
export const isFilterFacetConfig = (
  value?: boolean | FilterFacetConfig
): value is FilterFacetConfig =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FilterFacetConfig).getFacets === 'function';

/**
 * Feature configuration for enabling/customizing content list capabilities.
 */
export interface ContentListFeatures {
  /**
   * Synchronize query text and sort state with the current route's URL.
   *
   * Enabled by default when the provider is rendered inside a router. Set to
   * `false` for embedded lists, modals, sidebars, or secondary lists that share
   * a route with another URL-synced list.
   */
  urlSync?: boolean;

  /** Sorting configuration. */
  sorting?: SortingConfig | boolean;
  /** Pagination configuration. Set to `false` to disable pagination entirely. */
  pagination?: PaginationConfig | boolean;
  /** Search configuration. */
  search?: SearchConfig | boolean;
  /**
   * Selection configuration.
   *
   * - `true` (default): row checkboxes and bulk actions are enabled.
   * - `false`: selection is disabled entirely.
   * - {@link SelectionConfig}: selection is enabled with per-row gating (e.g.
   *   `selectable`, `selectableMessage`).
   *
   * Selection is automatically disabled when `isReadOnly` is `true`,
   * regardless of the value passed here.
   */
  selection?: boolean | SelectionConfig;
  /**
   * Tags feature configuration.
   *
   * - `true` or `undefined`: Auto-enabled when `services.tags` is provided.
   * - `false`: Explicitly disables tags even if `services.tags` is present.
   * - `FilterFacetConfig`: Enables tags with popover facets from `getFacets`.
   */
  tags?: boolean | FilterFacetConfig;

  /**
   * Starred feature configuration.
   *
   * - `true` or `undefined`: Auto-enabled when `services.favorites` is provided.
   * - `false`: Explicitly disables starring even if `services.favorites` is present.
   */
  starred?: boolean;

  /**
   * User profiles feature configuration (createdBy filter, etc.).
   *
   * - `true` or `undefined`: Auto-enabled when `services.userProfiles` is provided.
   * - `false`: Explicitly disables user profile features even if the service is present.
   * - `FilterFacetConfig`: Enables user profiles with popover facets from `getFacets`.
   */
  userProfiles?: boolean | FilterFacetConfig;

  /**
   * Additional field definitions for consumer-specific filter dimensions
   * (e.g. `updatedBy`, `type`, `status`).
   *
   * Merged with built-in field definitions (tag, createdBy) in `useFieldDefinitions`.
   * Each entry registers a field name in the search bar schema and provides
   * ID ↔ display resolution for query parsing.
   */
  fields?: FieldDefinition[];

  /**
   * Additional flag definitions for consumer-specific boolean toggles
   * (e.g. `is:managed`, `is:deprecated`).
   *
   * Merged with built-in flag definitions (starred) in `useFieldDefinitions`.
   */
  flags?: FlagDefinition[];
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
  /** Whether user profile filtering (createdBy) is supported. */
  userProfiles: boolean;
}
