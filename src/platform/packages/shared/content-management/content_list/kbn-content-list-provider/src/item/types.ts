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
 * regardless of the underlying datasource type. Raw items from the datasource
 * are transformed into this format using a {@link TransformFunction}.
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
 * Transform function that converts datasource items to `ContentListItem`.
 *
 * Used to convert raw items from your data source into the standardized
 * `ContentListItem` format that rendering components expect.
 *
 * @template T The raw item type from the datasource.
 *
 * @example
 * ```ts
 * const myTransform: TransformFunction<MyItem> = (item) => ({
 *   id: item.uuid,
 *   title: item.name,
 *   description: item.summary,
 *   updatedAt: new Date(item.modified),
 * });
 * ```
 */
export type TransformFunction<T> = (item: T) => ContentListItem;

/**
 * Per-item configuration for link behavior and actions.
 */
export interface ContentListItemConfig {
  /**
   * Function to generate the href for an item link.
   * When provided, item titles become clickable links.
   */
  getHref?: (item: ContentListItem) => string;
}
