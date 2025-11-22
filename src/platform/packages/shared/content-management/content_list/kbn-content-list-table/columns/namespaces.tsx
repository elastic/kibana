/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement, ReactNode } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { NameColumnProps } from './name/name_builder';
import type { UpdatedAtColumnProps } from './updated_at/updated_at_builder';
import type { CreatedByColumnProps } from './created_by/created_by_builder';
import type { ActionsColumnProps } from './actions/actions_builder';
import type { ExpanderColumnProps } from './expander/expander_builder';

/**
 * Function type for parsing column props from a React element.
 *
 * Each column exports this to handle its own prop extraction.
 *
 * @template TConfig - The parsed configuration type.
 */
export type ParseColumnProps<TConfig = unknown> = (element: ReactElement) => TConfig;

// ========================================
// Base Props for Columns
// ========================================

/**
 * Base props shared by column components.
 *
 * Uses a generic to allow components to add their own specific props.
 *
 * @template TAdditional - Additional props specific to the column type.
 *
 * @example
 * ```typescript
 * // Simple column with just base props.
 * type SimpleColumnProps = BaseColumnProps;
 *
 * // Column with sortable functionality.
 * type SortableColumnProps = BaseColumnProps<{
 *   sortable?: boolean;
 *   render?: (item: ContentListItem) => ReactNode;
 * }>;
 * ```
 */
export type BaseColumnProps<TAdditional = {}> = {
  /**
   * Column width (CSS value like '200px' or '40%').
   */
  width?: string;

  /**
   * Custom column title.
   */
  columnTitle?: string;
} & TAdditional;

// ========================================
// Base Props for Actions
// ========================================

/**
 * Base props shared by action components.
 *
 * Uses a generic to allow actions to add their own specific props.
 *
 * @template TAdditional - Additional props specific to the action type.
 *
 * @example
 * ```typescript
 * // Simple action with just base props.
 * type SimpleActionProps = BaseActionProps;
 *
 * // Custom action with handler and icon.
 * type CustomActionProps = BaseActionProps<{
 *   id: string;
 *   label: string;
 *   iconType: string;
 *   handler: (item: ContentListItem) => void;
 * }>;
 * ```
 */
export type BaseActionProps<TAdditional = {}> = {
  /**
   * Tooltip text for the action.
   */
  tooltip?: string;

  /**
   * Accessibility label.
   */
  'aria-label'?: string;
} & TAdditional;

/**
 * Props for custom action components.
 */
export type CustomActionProps = BaseActionProps<{
  /**
   * Unique identifier for the action.
   */
  id: string;

  /**
   * Display label for the action.
   */
  label: string;

  /**
   * EUI icon type.
   */
  iconType: string;

  /**
   * Icon color.
   */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text';

  /**
   * Handler function called when action is triggered.
   */
  handler: (item: ContentListItem) => void;
}>;

// `ActionsColumnProps` is now defined in `actions/actions_builder.tsx` and imported above.

// ========================================
// Namespace Interfaces
// ========================================

/**
 * Props for the generic `Column` component.
 *
 * @template T - Custom fields type to extend {@link ContentListItem}.
 */
export interface GenericColumnProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the column. */
  id: string;
  /** Display name for the column header. */
  name: string;
  /** Column width (CSS value like '200px' or '40%'). */
  width?: string;
  /** Whether the column is sortable. */
  sortable?: boolean;
  /** Render function for the column cells. */
  render: (item: ContentListItem<T>) => ReactNode;
}

/**
 * Namespace interface for `Column` sub-components.
 *
 * The base `Column` is generic for custom columns; pre-built columns are properties.
 */
export interface ColumnNamespace {
  <T extends Record<string, unknown> = Record<string, unknown>>(
    props: GenericColumnProps<T>
  ): ReactElement | null;
  Name: (props: NameColumnProps) => ReactElement | null;
  UpdatedAt: (props: UpdatedAtColumnProps) => ReactElement | null;
  CreatedBy: (props: CreatedByColumnProps) => ReactElement | null;
  Actions: (props: ActionsColumnProps) => ReactElement | null;
  Expander: (props: ExpanderColumnProps) => ReactElement | null;
}

/**
 * Namespace interface for `Action` sub-components.
 *
 * The base `Action` is for custom actions; pre-built actions are properties.
 */
export interface ActionNamespace {
  (props: CustomActionProps): ReactElement | null;
  ViewDetails: (props: BaseActionProps) => ReactElement | null;
  Edit: (props: BaseActionProps) => ReactElement | null;
  Delete: (props: BaseActionProps) => ReactElement | null;
  Duplicate: (props: BaseActionProps) => ReactElement | null;
  Export: (props: BaseActionProps) => ReactElement | null;
}

// ========================================
// Stable Component Identification
// ========================================

/**
 * Stable static property key for identifying ContentListTable components.
 *
 * Using a symbol would be ideal but doesn't serialize well across module boundaries.
 * Using a namespaced string constant that's unlikely to conflict with user code.
 */
export const CONTENT_LIST_TABLE_ROLE = '__kbnContentListTableRole' as const;

/**
 * Stable static property key for component ID.
 */
export const CONTENT_LIST_TABLE_ID = '__kbnContentListTableId' as const;

/**
 * Component role types for stable identification.
 */
export type ComponentRole = 'column' | 'action';

/**
 * Known column IDs for built-in columns.
 */
export type ColumnId = 'name' | 'updatedAt' | 'createdBy' | 'actions' | 'expander';

/**
 * Known action IDs for built-in actions.
 */
export type ActionId = 'viewDetails' | 'edit' | 'delete' | 'duplicate' | 'export';

/**
 * Interface for components with stable identification properties.
 */
export interface ContentListTableComponent {
  [CONTENT_LIST_TABLE_ROLE]?: ComponentRole;
  [CONTENT_LIST_TABLE_ID]?: string;
  displayName?: string;
  name?: string;
}

/**
 * Internal type for React-like element structure used in type guards.
 */
interface ReactLikeElement {
  type?: ContentListTableComponent;
  props?: Record<string, unknown>;
}

/**
 * Type guard to check if value looks like a React element.
 *
 * @param value - Value to check.
 * @returns `true` if the value has React element structure.
 */
const isReactLikeElement = (value: unknown): value is ReactLikeElement => {
  return typeof value === 'object' && value !== null && 'type' in value;
};

/**
 * Type guard to check if a React element is a `Column` component.
 *
 * Uses stable static properties first, falls back to `displayName` for compatibility.
 *
 * @param element - Element to check.
 * @returns `true` if the element is a `Column` component.
 */
export const isColumnComponent = (element: unknown): boolean => {
  if (!isReactLikeElement(element) || !element.type) {
    return false;
  }

  // Prefer stable static property.
  if (element.type[CONTENT_LIST_TABLE_ROLE] === 'column') {
    return true;
  }

  // Fallback to `displayName` for backwards compatibility.
  const name = element.type.displayName || element.type.name || '';
  return (
    name === 'Column' ||
    name === 'NameColumn' ||
    name === 'UpdatedAtColumn' ||
    name === 'CreatedByColumn' ||
    name === 'ActionsColumn' ||
    name === 'ExpanderColumn'
  );
};

/**
 * Type guard to check if a React element is an `Action` component.
 *
 * Uses stable static properties first, falls back to `displayName` for compatibility.
 *
 * @param element - Element to check.
 * @returns `true` if the element is an `Action` component.
 */
export const isActionComponent = (element: unknown): boolean => {
  if (!isReactLikeElement(element) || !element.type) {
    return false;
  }

  // Prefer stable static property.
  if (element.type[CONTENT_LIST_TABLE_ROLE] === 'action') {
    return true;
  }

  // Fallback to `displayName` for backwards compatibility.
  const name = element.type.displayName || element.type.name || '';
  return (
    name === 'Action' ||
    name === 'CustomAction' ||
    name === 'ViewDetailsAction' ||
    name === 'EditAction' ||
    name === 'DeleteAction' ||
    name === 'DuplicateAction' ||
    name === 'ExportAction'
  );
};

/**
 * Get the column ID from a column component element.
 *
 * Uses stable static properties first, falls back to `displayName` for compatibility.
 *
 * @param element - Element to extract ID from.
 * @returns The column ID or `undefined` if not found.
 */
export const getColumnId = (element: unknown): string | undefined => {
  if (!isColumnComponent(element) || !isReactLikeElement(element)) {
    return undefined;
  }

  const props = element.props || {};

  // Check for explicit id prop first.
  if (props.id) {
    return String(props.id);
  }

  // Prefer stable static property.
  if (element.type?.[CONTENT_LIST_TABLE_ID]) {
    return element.type[CONTENT_LIST_TABLE_ID];
  }

  // Fallback to `displayName` mapping for backwards compatibility.
  const name = element.type?.displayName || element.type?.name || '';
  const nameToId = {
    NameColumn: 'name',
    UpdatedAtColumn: 'updatedAt',
    CreatedByColumn: 'createdBy',
    ActionsColumn: 'actions',
    ExpanderColumn: 'expander',
  } as const satisfies Record<string, ColumnId>;

  return nameToId[name as keyof typeof nameToId];
};

/**
 * Get the action ID from an action component element.
 *
 * Uses stable static properties first, falls back to `displayName` for compatibility.
 *
 * @param element - Element to extract ID from.
 * @returns The action ID or `undefined` if not found.
 */
export const getActionId = (element: unknown): string | undefined => {
  if (!isActionComponent(element) || !isReactLikeElement(element)) {
    return undefined;
  }

  const props = element.props || {};

  // Check for explicit id prop first.
  if (props.id) {
    return String(props.id);
  }

  // Prefer stable static property.
  if (element.type?.[CONTENT_LIST_TABLE_ID]) {
    return element.type[CONTENT_LIST_TABLE_ID];
  }

  // Fallback to `displayName` mapping for backwards compatibility.
  const name = element.type?.displayName || element.type?.name || '';
  const nameToId = {
    ViewDetailsAction: 'viewDetails',
    EditAction: 'edit',
    DeleteAction: 'delete',
    DuplicateAction: 'duplicate',
    ExportAction: 'export',
  } as const satisfies Record<string, ActionId>;

  return nameToId[name as keyof typeof nameToId];
};
