/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Pagination configuration options.
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   pagination={{
 *     initialPageSize: 25,
 *     pageSizeOptions: [10, 25, 50, 100],
 *   }}
 * />
 * ```
 */
export interface PaginationConfig {
  /**
   * Initial number of items per page.
   * @default 20
   */
  initialPageSize?: number;
  /**
   * Available page size options in the dropdown.
   * @default [10, 20, 50, 100]
   */
  pageSizeOptions?: number[];
}
