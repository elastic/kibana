/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem, ItemConfig } from '@kbn/content-list-provider';

/**
 * Feature support flags from the provider.
 */
export interface SupportsConfig {
  /** Whether tags feature is enabled. */
  tags: boolean;
  /** Whether favorites feature is enabled. */
  favorites: boolean;
  /** Whether user profiles feature is enabled. */
  userProfiles: boolean;
  /** Whether content editor feature is enabled. */
  contentEditor: boolean;
  /** Whether content insights feature is enabled. */
  contentInsights: boolean;
}

/**
 * Expander context for row expansion functionality.
 */
export interface ExpanderContext {
  /** Check if an item has expandable content. */
  hasExpandableContent: (item: ContentListItem) => boolean;
  /** Check if a row is currently expanded. */
  isRowExpanded: (item: ContentListItem) => boolean;
  /** Toggle row expansion state. */
  toggleRowExpanded: (item: ContentListItem) => void;
  /** Whether any items have expandable content. */
  hasAnyExpandableContent: boolean;
}

/**
 * Context passed to column builder functions.
 */
export interface ColumnBuilderContext {
  /** Item configuration from the content list provider. */
  itemConfig?: ItemConfig;
  /** Whether the table is in read-only mode. */
  isReadOnly?: boolean;
  /** List of sortable field names from sorting configuration. */
  sortableFields?: string[];
  /** Entity name for display in tooltips and messages. */
  entityName?: string;
  /** Feature support flags from the provider. */
  supports?: SupportsConfig;
  /** Expander context for row expansion (only provided when `renderDetails` is set). */
  expander?: ExpanderContext;
  /**
   * Auto-wired content editor action handler.
   * When provided and `item.actions.onViewDetails` is not configured,
   * the "View details" action will use this handler.
   */
  contentEditorAction?: (item: ContentListItem) => void;
}

/**
 * Standard column builder function signature.
 *
 * Each column exports a `buildColumn` function conforming to this type.
 *
 * @template TConfig - The configuration type for the column.
 */
export type ColumnBuilder<TConfig = any> = (
  config: TConfig,
  context: ColumnBuilderContext
) => EuiBasicTableColumn<ContentListItem> | null;

/**
 * Helper type that creates discriminated unions for column variants.
 *
 * This enables variant-specific prop availability with full TypeScript validation.
 *
 * @template TVariants - Record of variant names to their specific props.
 * @template TCommonProps - Props shared across all variants.
 *
 * @example
 * ```typescript
 * type MyColumnVariants = {
 *   simple: {};
 *   withDescription: { showDescription?: boolean };
 *   full: { showDescription?: boolean; showTags?: boolean };
 * };
 *
 * type CommonProps = { width?: string; sortable?: boolean; };
 *
 * type MyColumnProps = ColumnVariantProps<MyColumnVariants, CommonProps>;
 *
 * // Now TypeScript will only show `showTags` when `variant="full"`.
 * <MyColumn variant="full" showTags={true} /> // ✓ Valid
 * <MyColumn variant="simple" showTags={true} /> // ✗ Error
 * ```
 */
export type ColumnVariantProps<
  TVariants extends Record<string, object> = Record<string, object>,
  TCommonProps extends object = {}
> = {
  [K in keyof TVariants]: { variant?: K } & TCommonProps & TVariants[K];
}[keyof TVariants];
