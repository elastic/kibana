/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Content List Table
 *
 * Table component for rendering content listings with configurable columns.
 */

// Main component.
export {
  ContentListTable,
  Column,
  Action,
  getRowId,
  type ContentListTableProps,
} from './src/content_list_table';

// Column components.
export { NameColumn, NameCell, type NameColumnProps, type NameCellProps } from './src/column';
export {
  ActionsColumn,
  type ActionsColumnProps,
  UpdatedAtColumn,
  UpdatedAtCell,
  type UpdatedAtColumnProps,
  type UpdatedAtCellProps,
} from './src/column';
export type { ColumnNamespace, ColumnProps } from './src/column';

// Action components.
export {
  EditAction,
  DeleteAction,
  type EditActionProps,
  type DeleteActionProps,
} from './src/action';
export type { ActionNamespace, ActionProps } from './src/action';

// Empty state.
export { EmptyState, type EmptyStateProps } from './src/empty_state';
