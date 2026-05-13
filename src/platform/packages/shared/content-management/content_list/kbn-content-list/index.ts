/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List
 *
 * Curated facade package for content list composition.
 */

export { ContentList, type ContentListProps } from './src/layout';
export {
  ContentListEmptyState,
  type ContentListEmptyStateProps,
  type ContentListEmptyStatePrimaryAction,
} from './src/empty_state';

export {
  ContentListProvider,
  useContentListConfig,
  useContentListItems,
  useContentListState,
  useContentListPhase,
  useContentListSort,
  useContentListSearch,
  useContentListPagination,
  useContentListSelection,
  useContentListFilters,
  useFilterToggle,
  useTagFilterToggle,
  useCreatedByFilterToggle,
  useFilterFacets,
  DeleteConfirmationModal,
  DeleteConfirmationComponent,
  useDeleteConfirmation,
  ProfileCache,
  ProfileCacheContext,
  useProfileCache,
  useProfileCacheVersion,
  useProfile,
} from '@kbn/content-list-provider';
export type {
  ContentListProviderProps,
  ContentListIdentity,
  ContentListLabels,
  ContentListCoreConfig,
  ContentListConfig,
  ContentListServices,
  ContentListPhase,
  ContentListItem,
  ContentListItemConfig,
  ContentListFeatures,
  FilterFacet,
  SortField,
  SortOption,
  SortingConfig,
  PaginationConfig,
  SearchConfig,
  DeleteConfirmationModalProps,
  DeleteConfirmationComponentProps,
  UseDeleteConfirmationOptions,
  FindItemsParams,
  FindItemsResult,
  DataSourceConfig,
} from '@kbn/content-list-provider';

// Toolbar.
//
// `Filters` and `SelectionBar` are reachable via `ContentListToolbar.Filters`
// and `ContentListToolbar.SelectionBar`; only the entry component plus its
// non-namespaced helpers are re-exported here.
export {
  ContentListToolbar,
  FilterPopover,
  FilterPopoverHeader,
  SelectableFilterPopover,
  StandardFilterOption,
  CreatedByFilter,
} from '@kbn/content-list-toolbar';
export type { ContentListToolbarProps } from '@kbn/content-list-toolbar';

export {
  ContentListTable,
  Column,
  Action,
  getRowId,
  NameColumn,
  NameCell,
  NameCellTags,
  ActionsColumn,
  UpdatedAtColumn,
  UpdatedAtCell,
  StarredColumn,
  StarredCell,
  StarButton,
  CreatedByColumn,
  CreatedByCell,
  EditAction,
  DeleteAction,
  InspectAction,
  useSelection,
} from '@kbn/content-list-table';
export type {
  ContentListTableProps,
  NameColumnProps,
  NameCellProps,
  NameCellTagsProps,
  ActionsColumnProps,
  UpdatedAtColumnProps,
  UpdatedAtCellProps,
  StarredColumnProps,
  StarredCellProps,
  StarButtonProps,
  CreatedByColumnProps,
  CreatedByCellProps,
  ColumnNamespace,
  ColumnProps,
  EditActionProps,
  DeleteActionProps,
  InspectActionProps,
  ActionNamespace,
  ActionProps,
  UseSelectionReturn,
} from '@kbn/content-list-table';

export { ContentListFooter, PaginationComponent } from '@kbn/content-list-footer';
export type { ContentListFooterProps, PaginationComponentProps } from '@kbn/content-list-footer';
