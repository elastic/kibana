/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentListServices } from '@kbn/content-list-provider';

/**
 * UI settings accessor interface.
 *
 * Matches the minimal surface of `IUiSettingsClient` needed by the client provider.
 */
interface UiSettingsAccessor {
  get: <T = unknown>(key: string) => T;
}

/**
 * Services required by the client provider.
 *
 * Extends the base `ContentListServices` with `uiSettings`, which is used to read
 * the `savedObjects:perPage` and `savedObjects:listingLimit` settings.
 */
export interface ContentListClientServices extends ContentListServices {
  /** UI settings accessor. Required for reading defaults like page size and listing limit. */
  uiSettings: UiSettingsAccessor;
}

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
 * Options passed to {@link TableListViewFindItemsFn} alongside the search query.
 */
export interface TableListViewFindItemsOptions {
  /** Saved object references to filter by. */
  references?: SavedObjectReference[];
  /** Saved object references to exclude. */
  referencesToExclude?: SavedObjectReference[];
  /**
   * Maximum number of items to fetch from the server.
   *
   * Populated automatically by {@link ContentListClientProvider} from the
   * `savedObjects:listingLimit` UI setting. Consumers should forward this value
   * to their underlying search call so they do not need to read the setting themselves.
   */
  listingLimit?: number;
}

/**
 * The existing `TableListView` `findItems` signature that consumers already have.
 *
 * This matches the signature expected by `TableListViewTableProps.findItems`, with an
 * optional `signal` parameter for request cancellation.
 */
export type TableListViewFindItemsFn = (
  searchQuery: string,
  options?: TableListViewFindItemsOptions,
  /** Optional abort signal for request cancellation. */
  signal?: AbortSignal
) => Promise<TableListViewFindItemsResult>;
