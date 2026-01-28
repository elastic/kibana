/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';

/**
 * Row action descriptor - extends `EuiButtonIconProps` but receives item instead of mouse event.
 */
export interface RowActionProps extends Omit<EuiButtonIconProps, 'onClick'> {
  /** Unique identifier for the action. */
  id: string;
  /** Callback receives the row item instead of the mouse event. */
  onClick: (item: ContentListItem) => void | Promise<void>;
  /** Optional tooltip content. */
  tooltip?: ReactNode;
}

/**
 * Supported column configuration for Name column.
 */
export interface NameColumnConfig {
  /** Custom column header title. */
  columnTitle?: string;
  /** Custom render function for the cell content. */
  render?: (item: ContentListItem) => ReactNode;
  /** Column width (CSS value like '200px' or '40%'). */
  width?: string;
  /** Whether the column is sortable. */
  sortable?: boolean;
}

/**
 * Supported column configuration for UpdatedAt column.
 */
export interface UpdatedAtColumnConfig {
  /** Custom column header title. */
  columnTitle?: string;
  /** Custom render function for the cell content. */
  render?: (item: ContentListItem, date?: Date) => ReactNode;
  /** Column width (CSS value like '200px' or '40%'). */
  width?: string;
}

/**
 * Supported column configuration for CreatedBy column.
 */
export interface CreatedByColumnConfig {
  /** Custom column header title. */
  columnTitle?: string;
  /** Custom render function for the cell content. */
  render?: (item: ContentListItem, user?: string) => ReactNode;
  /** Column width (CSS value like '200px' or '40%'). */
  width?: string;
}

/**
 * Supported column configuration for Actions column.
 *
 * Note: The Actions column uses `EuiBasicTable`'s native Row Actions functionality.
 * Actions are automatically derived from the provider context (`itemConfig.actions`).
 * @see https://eui.elastic.co/docs/components/tables/basic/#row-actions
 */
export interface ActionsColumnConfig {
  /** Optional custom title for the actions column header. */
  columnTitle?: string;
  /** Optional width override for the actions column. */
  width?: string;
}

/**
 * Supported column configuration for Expander column.
 */
export interface ExpanderColumnConfig {
  /** Optional width override for the expander column. */
  width?: string;
  /** Icon configuration for expanded/collapsed states. */
  iconType?: {
    /** Icon to show when row is expanded (default: 'arrowDown'). */
    expanded?: IconType;
    /** Icon to show when row is collapsed (default: 'arrowRight'). */
    collapsed?: IconType;
  };
}

/**
 * Supported columns configuration.
 *
 * Map of column names to their configuration or boolean to enable/disable.
 */
export interface SupportedColumnsConfig {
  /** Name column configuration or `true`/`false` to enable/disable. */
  name?: boolean | NameColumnConfig;
  /** UpdatedAt column configuration or `true`/`false` to enable/disable. */
  updatedAt?: boolean | UpdatedAtColumnConfig;
  /** CreatedBy column configuration or `true`/`false` to enable/disable. */
  createdBy?: boolean | CreatedByColumnConfig;
  /** Actions column configuration or `true`/`false` to enable/disable. */
  actions?: boolean | ActionsColumnConfig;
  /** Expander column configuration or `true`/`false` to enable/disable. */
  expander?: boolean | ExpanderColumnConfig;
}

// ============================================================================
// Phase 2: Type-Safe Columns and Actions API
// ============================================================================

import type { EuiBasicTableColumn } from '@elastic/eui';

/**
 * Known column keys for default columns.
 */
export type KnownColumnKey = 'name' | 'updatedAt' | 'createdBy' | 'actions' | 'expander';

/**
 * Configuration for custom columns (user-provided columns not in {@link KnownColumnKey}).
 */
export type CustomColumnConfig = Omit<EuiBasicTableColumn<ContentListItem>, 'field'>;

/**
 * Type-safe column configuration map.
 *
 * - Known columns are optional and can be boolean or config object.
 * - Custom columns (not in {@link KnownColumnKey}) must provide full {@link CustomColumnConfig}.
 *
 * @template TColumns - Tuple of column keys.
 */
export type ColumnConfigMap<TColumns extends readonly string[]> = {
  [K in KnownColumnKey]?: boolean | SupportedColumnsConfig[K];
} & {
  [K in Exclude<TColumns[number], KnownColumnKey>]: CustomColumnConfig;
};
