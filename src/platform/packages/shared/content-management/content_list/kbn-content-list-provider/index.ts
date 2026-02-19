/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Provider
 *
 * A modular, feature-based architecture for building content listing UIs.
 */

// Provider.
export { ContentListProvider, useContentListConfig } from './src/context';
export type {
  ContentListProviderProps,
  ContentListIdentity,
  ContentListLabels,
  ContentListCoreConfig,
  ContentListConfig,
} from './src/context';

// Hooks.
export { useContentListItems, useContentListState } from './src/state';
export type { ContentListQueryData } from './src/state';
export { useContentListSort, useContentListSearch } from './src/features';
export { useContentListPagination } from './src/features';

// State.
export { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './src/state';
export type { ContentListAction } from './src/state';

// Types.
export type { ContentListItem, ContentListItemConfig } from './src/item';
export type {
  ContentListFeatures,
  ContentListSupports,
  SortField,
  SortOption,
  SortingConfig,
  UseContentListSortReturn,
  PaginationConfig,
  UseContentListPaginationReturn,
  SearchConfig,
  UseContentListSearchReturn,
} from './src/features';
export type {
  ActiveFilters,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  DataSourceConfig,
} from './src/datasource';

// Utilities.
export { contentListKeys } from './src/query';
