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
  ContentListServices,
} from './src/context';
export type { UserProfileService } from './src/services';

// Hooks.
export { useContentListItems, useContentListState } from './src/state';
export type { ContentListQueryData } from './src/state';
export {
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListSelection,
  useFilterDisplay,
  useContentListFilters,
  useTagFilterToggle,
  useContentListUserFilter,
  useUserFilterToggle,
  TAG_FILTER_ID,
  CREATED_BY_FILTER_ID,
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
  MANAGED_QUERY_VALUE,
  NO_CREATOR_QUERY_VALUE,
  DeleteConfirmationModal,
  DeleteConfirmationComponent,
  useDeleteConfirmation,
} from './src/features';

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
  UseContentListSelectionReturn,
  FilterDisplayState,
  UseContentListFiltersReturn,
  CreatorsList,
  UseContentListUserFilterReturn,
  UserFilterToggleFn,
  DeleteConfirmationModalProps,
  DeleteConfirmationComponentProps,
  UseDeleteConfirmationOptions,
  UseDeleteConfirmationReturn,
} from './src/features';
export type {
  ActiveFilters,
  IncludeExcludeFilter,
  UserFilter,
  FilterCounts,
  FindItemsFn,
  FindItemsParams,
  FindItemsResult,
  DataSourceConfig,
} from './src/datasource';

// Utilities.
export { contentListKeys } from './src/query';
