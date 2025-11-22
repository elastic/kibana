/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// ========================================
// PUBLIC API - Declarative Components & Types
// ========================================

/**
 * Column specification components for declarative table configuration.
 * Use these as children of ContentListTable to define columns.
 *
 * @example
 * ```tsx
 * const { Column, Action } = ContentListTable;
 *
 * <ContentListTable>
 *   <Column.Name />
 *   <Column.UpdatedAt width="200px" />
 *   <Column.Actions>
 *     <Action.Edit />
 *     <Action.Delete />
 *   </Column.Actions>
 * </ContentListTable>
 * ```
 */
export { Column, type ColumnProps } from './column';
export { NameColumn, type NameColumnProps, NameCell, type NameCellProps } from './name';
export { UpdatedAtColumn, type UpdatedAtColumnProps } from './updated_at';
export { CreatedByColumn, type CreatedByColumnProps } from './created_by';
export {
  ActionsColumn,
  type ActionsColumnProps,
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
} from './actions';
export { ExpanderColumn, type ExpanderColumnProps, type ExpanderIconTypeConfig } from './expander';

/**
 * Namespace types for TypeScript typing of Column and Action.
 * These are exported from ContentListTable and can be destructured.
 */
export type { ColumnNamespace, ActionNamespace } from './namespaces';

/**
 * Helper type for creating variant-based column props.
 * Useful for creating custom columns with variants.
 */
export type {
  ColumnVariantProps,
  ColumnBuilderContext,
  SupportsConfig,
  ExpanderContext,
} from './types';

// ========================================
// INTERNAL EXPORTS (for package use only)
// ========================================
// These are exported for use within the content-list package but should not
// be considered part of the public API. They may change without notice.

export { buildColumnsFromConfig } from './build_columns';
export { parseColumnsFromChildren } from './parse_children';
export { SafeRender, createSafeRender, type SafeRenderProps } from './safe_render';
