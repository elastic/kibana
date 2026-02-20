/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standardized item structure for rendering components (tables, grids, etc.).
 *
 * This is the common interface that all rendering components work with,
 * regardless of the underlying datasource type. The `findItems` function
 * in `DataSourceConfig` must return items in this format.
 *
 * @template T Additional properties to include on the item type.
 */
export type ContentListItem<T = Record<string, unknown>> = T & {
  /** Unique identifier for the item. */
  id: string;
  /** Display title for the item. */
  title: string;
  /** Optional description text. */
  description?: string;
  /** Item type identifier (e.g., "dashboard", "visualization"). */
  type?: string;
  /** Last update timestamp. */
  updatedAt?: Date;
};

/**
 * Per-item configuration for link behavior and actions.
 */
export interface ContentListItemConfig {
  /**
   * Function to generate the href for an item link.
   * When provided, item titles become clickable links.
   */
  getHref?: (item: ContentListItem) => string;

  /**
   * Function to generate the edit URL for an item.
   * When provided, the edit action renders as an `<a>` link with this `href`,
   * preserving native link behavior (right-click, middle-click, screen reader
   * announcement).
   *
   * Composable with `onEdit`: when both are provided, the action renders as a
   * link (`href`) and also calls `onEdit` on click (e.g., for analytics tracking).
   */
  getEditUrl?: (item: ContentListItem) => string;

  /**
   * Callback invoked when the edit action is clicked.
   * Use this for side effects such as opening a flyout, tracking analytics,
   * or programmatic navigation.
   *
   * When provided alone, the action renders as a button with an `onClick` handler.
   * When provided alongside `getEditUrl`, both are applied: the action renders
   * as a link and the callback fires on click.
   */
  onEdit?: (item: ContentListItem) => void;

  /**
   * Callback invoked to delete one or more items.
   * When provided, enables the delete action on rows.
   * The callback should handle the actual deletion and return a resolved promise on success.
   */
  onDelete?: (items: ContentListItem[]) => Promise<void>;
}
