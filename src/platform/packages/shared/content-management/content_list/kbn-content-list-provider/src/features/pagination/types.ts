/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Default number of items per page. */
export const DEFAULT_PAGE_SIZE = 20;

/** Default page size options shown in the pagination dropdown. */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * Pagination configuration.
 *
 * @example
 * ```ts
 * // Use defaults (page size 20, options [10, 20, 50, 100]).
 * features: { pagination: true }
 *
 * // Custom initial page size and options.
 * features: {
 *   pagination: {
 *     initialPageSize: 50,
 *     pageSizeOptions: [25, 50, 100],
 *   },
 * }
 *
 * // Disable pagination entirely.
 * features: { pagination: false }
 * ```
 */
export interface PaginationConfig {
  /** Initial number of items per page. Defaults to {@link DEFAULT_PAGE_SIZE}. */
  initialPageSize?: number;
  /** Available page size options. Defaults to {@link DEFAULT_PAGE_SIZE_OPTIONS}. */
  pageSizeOptions?: number[];
}
