/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

/**
 * Reference type matching `SavedObjectsFindOptionsReference` from Kibana core.
 */
export interface SavedObjectReference {
  type: string;
  id: string;
  name?: string;
}

/**
 * Result type from the `TableListView` `findItems` function.
 */
export interface TableListViewFindItemsResult {
  /** Total count of matching items. */
  total: number;
  /** Items matching the search query. */
  hits: UserContentCommonSchema[];
}

/**
 * The existing `TableListView` `findItems` signature that consumers already have.
 *
 * This matches the signature expected by `TableListViewTableProps.findItems`, with an
 * optional `signal` parameter for request cancellation.
 */
export type TableListViewFindItemsFn = (
  searchQuery: string,
  refs?: {
    references?: SavedObjectReference[];
    referencesToExclude?: SavedObjectReference[];
  },
  /** Optional abort signal for request cancellation. */
  signal?: AbortSignal
) => Promise<TableListViewFindItemsResult>;
