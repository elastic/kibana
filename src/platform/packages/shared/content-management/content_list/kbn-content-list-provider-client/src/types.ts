/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  ContentListFeatures,
  ContentListServices,
  SortingConfig,
} from '@kbn/content-list-provider';
import type { ContentEditorKibanaDependencies } from '@kbn/content-management-content-editor';
import type { ContentEditorConfig } from './content_editor';
import type { ContentListFilterMap } from './filters';
import type { ContentListSortFieldConfig } from './sorting';

/**
 * Kibana `CoreStart` slice required by {@link ContentEditorKibanaProvider}.
 */
export type ContentEditorKibanaCore = ContentEditorKibanaDependencies['core'];

/**
 * Kibana `CoreStart` slice required by {@link ContentListClientProvider}.\
 */
export type ContentListKibanaCore = ContentEditorKibanaCore & {
  uiSettings: { get: <T = unknown>(key: string) => T };
};

/**
 * Kibana `SavedObjectTaggingPluginStart` slice required by {@link ContentEditorKibanaProvider}.
 */
export type ContentListSavedObjectsTagging = ContentEditorKibanaDependencies['savedObjectsTagging'];

/**
 * Domain services required by {@link ContentListClientProvider}.
 */
export interface ContentListClientServices extends ContentListServices {
  /**
   * Optional Saved Objects Tagging plugin start contract. A full
   * `SavedObjectTaggingPluginStart` value satisfies this structurally.
   */
  savedObjectsTagging?: ContentListSavedObjectsTagging;
}

/**
 * Feature configuration for {@link ContentListClientProvider}.
 */
export type ContentListFilterConfig =
  | ContentListFilterMap
  | ((defaults: ContentListFilterMap) => ContentListFilterMap);

export interface ContentListClientSortingConfig extends Omit<SortingConfig, 'fields'> {
  fields?: SortingConfig['fields'] | ContentListSortFieldConfig;
}

export interface ContentListClientFeatures
  extends Omit<ContentListFeatures, 'contentEditor' | 'sorting' | 'toolbarFilters'> {
  /**
   * Content editor (metadata editing flyout) feature configuration.
   */
  contentEditor?: ContentEditorConfig;
  /** Client-side custom filters keyed by filter id. */
  filters?: ContentListFilterConfig;
  /** Sorting configuration with client-side custom sort field support. */
  sorting?: boolean | ContentListClientSortingConfig;
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
