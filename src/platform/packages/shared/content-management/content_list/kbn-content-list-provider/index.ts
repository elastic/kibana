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

// Hooks.
export { useContentListItems, useContentListState } from './src/state';
export {
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListSelection,
  useFilterDisplay,
  useContentListFilters,
  useTagFilterToggle,
  useUserFilterToggle,
  TAG_FILTER_ID,
  DeleteConfirmationModal,
  DeleteConfirmationComponent,
  useDeleteConfirmation,
  useContentListUserFilter,
} from './src/features';

// State.
export { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './src/state';
export type { ContentListAction } from './src/state';

// Types — features.
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
  DeleteConfirmationModalProps,
  DeleteConfirmationComponentProps,
  UseDeleteConfirmationOptions,
  UseDeleteConfirmationReturn,
  UseContentListUserFilterReturn,
  CreatorsList,
} from './src/features';
export { MANAGED_USER_FILTER, NO_CREATOR_USER_FILTER } from './src/features';

// Types — datasource.
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

// Types — item.
export type { ContentListItem, ContentListItemConfig } from './src/item';

// Types — services.
export type { UserProfileService } from './src/services';

// Types — state.
export type { ContentListQueryData } from './src/state';

// Utilities.
export { contentListKeys } from './src/query';
export { contentListQueryClient } from './src/query';
