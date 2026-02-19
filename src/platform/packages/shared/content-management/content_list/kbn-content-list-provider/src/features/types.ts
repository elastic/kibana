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
}

/**
 * Type guard to check if sorting config is a `SortingConfig` object (not boolean).
 */
export const isSortingConfig = (sorting?: SortingConfig | boolean): sorting is SortingConfig => {
  return typeof sorting === 'object' && sorting !== null;
};

/**
 * Type guard to check if pagination config is a `PaginationConfig` object (not boolean).
 */
export const isPaginationConfig = (
  pagination?: PaginationConfig | boolean
): pagination is PaginationConfig => {
  return typeof pagination === 'object' && pagination !== null;
};

/**
 * Type guard to check if search config is a `SearchConfig` object (not boolean).
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
}
