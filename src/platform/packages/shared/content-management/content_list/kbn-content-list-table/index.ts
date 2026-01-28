/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// ========================================
// PUBLIC API
// ========================================

/**
 * Main table component for displaying content lists.
 *
 * Use with declarative column configuration or defaults.
 * Integrates with {@link ContentListProvider} from `@kbn/content-list-provider`.
 *
 * @example Basic usage with defaults
 * ```tsx
 * // With defaults (Name, UpdatedAt, Actions with all provider actions).
 * <ContentListTable />
 * ```
 *
 * @example Declarative column configuration
 * ```tsx
 * // Destructure `Column` and `Action` for cleaner code.
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name showTags={true} />
 *   <Column.UpdatedAt />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export { ContentListTable, type ContentListTableProps, Column, Action } from './content_list_table';

/**
 * Declarative column components for configuring table columns.
 *
 * Use as children of {@link ContentListTable}.
 *
 * Note: `Column` and `Action` are exported from {@link ContentListTable} (namespace objects).
 * Individual column components are exported here for advanced use cases.
 */
export {
  type ColumnProps,
  NameColumn,
  type NameColumnProps,
  UpdatedAtColumn,
  type UpdatedAtColumnProps,
  CreatedByColumn,
  type CreatedByColumnProps,
  ActionsColumn,
  type ActionsColumnProps,
} from './columns';

/**
 * Declarative action components for configuring table actions.
 *
 * Use as children of `Column.Actions`.
 */
export {
  ViewDetailsAction,
  type ViewDetailsActionProps,
  EditAction,
  type EditActionProps,
  DeleteAction,
  type DeleteActionProps,
  DuplicateAction,
  type DuplicateActionProps,
  ExportAction,
  type ExportActionProps,
  CustomAction,
  type CustomActionProps,
} from './columns';

/**
 * TypeScript namespace types for `Column` and `Action`.
 *
 * Useful for typing custom components that wrap the table.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 * // `Column` is typed as `ColumnNamespace`.
 * // `Action` is typed as `ActionNamespace`.
 * ```
 */
export type { ColumnNamespace, ActionNamespace } from './columns';

/**
 * Helper type for creating variant-based column props.
 *
 * Useful for creating custom columns with variant-specific props.
 */
export type { ColumnVariantProps } from './columns';

/**
 * Empty state components for different scenarios.
 *
 * - {@link NoItemsEmptyState} - First-time use when no items exist.
 * - {@link NoResultsEmptyState} - When search/filters return no results.
 * - {@link ErrorEmptyState} - When an error occurs loading items.
 */
export {
  NoItemsEmptyState,
  type NoItemsEmptyStateProps,
  NoResultsEmptyState,
  type NoResultsEmptyStateProps,
  ErrorEmptyState,
  type ErrorEmptyStateProps,
} from './empty_state';

/**
 * Configuration types used in {@link ContentListTableProps}.
 */
export type { RowActionProps } from './types';
