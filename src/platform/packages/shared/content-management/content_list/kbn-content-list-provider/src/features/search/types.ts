/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Search configuration options.
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   search={{
 *     placeholder: 'Search dashboards...',
 *     initialQuery: 'tag:important',
 *     debounceMs: 500,
 *   }}
 * />
 * ```
 */
export interface SearchConfig {
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Initial search query text (can include filter syntax like `tag:foo`). */
  initialQuery?: string;
  /**
   * Debounce delay in milliseconds before updating the query state.
   * Set to `0` for no debouncing.
   * @default 300
   */
  debounceMs?: number;
}
