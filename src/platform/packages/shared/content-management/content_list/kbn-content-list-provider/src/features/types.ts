/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortingConfig } from './sorting';

/**
 * Feature configuration for enabling/customizing content list capabilities.
 */
export interface ContentListFeatures {
  /** Sorting configuration. */
  sorting?: SortingConfig | boolean;
}

/**
 * Type guard to check if sorting config is a `SortingConfig` object (not boolean).
 */
export const isSortingConfig = (
  sorting: ContentListFeatures['sorting']
): sorting is SortingConfig => {
  return typeof sorting === 'object' && sorting !== null;
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
}
