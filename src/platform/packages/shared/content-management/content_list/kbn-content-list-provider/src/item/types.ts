/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsReference } from '@kbn/content-management-content-editor';

/**
 * Standardized item structure for rendering components (tables, grids, etc.).
 * This is the common interface that all rendering components work with,
 * regardless of the underlying datasource type.
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
  /** Creation timestamp. */
  createdAt?: Date;
  /** User ID who last updated the item. */
  updatedBy?: string;
  /** User ID who created the item. */
  createdBy?: string;
  /** Array of tag IDs associated with this item. */
  tags?: string[];
  /** Saved object references (for advanced use cases). */
  references?: SavedObjectsReference[];
  /**
   * Whether this item can be starred. Uses an **opt-out** model:
   * - `undefined` (default): Show star button if provider supports starring.
   * - `true`: Explicitly enable starring for this item.
   * - `false`: Explicitly disable starring for this item.
   *
   * The star button renders when `supports.starred` is `true` on the provider
   * AND `canStar` is not `false`.
   */
  canStar?: boolean;
  /** Whether this item is managed (system-created, e.g., by Elastic Agent). */
  isManaged?: boolean;
};

/**
 * Transform function type that converts datasource items to `ContentListItem`.
 *
 * Used to convert raw items from your data source into the standardized
 * `ContentListItem` format that rendering components expect.
 *
 * @template T The raw item type from the datasource.
 *
 * @example
 * ```ts
 * // Custom transform for a non-standard data source
 * const myTransform: TransformFunction<MyItem> = (item) => ({
 *   id: item.uuid,
 *   title: item.name,
 *   description: item.summary,
 *   updatedAt: new Date(item.modified),
 *   createdBy: item.author,
 * });
 *
 * <ContentListProvider
 *   dataSource={{
 *     findItems: fetchMyItems,
 *     transform: myTransform,
 *   }}
 * />
 * ```
 */
export type TransformFunction<T> = (item: T) => ContentListItem;

/**
 * Handler function for an action.
 */
export type ActionHandler = (item: ContentListItem) => void;

/**
 * Full action configuration object with handler and optional `isEnabled`.
 */
export interface ActionConfigObject {
  /** Handler function when action is triggered. */
  handler: ActionHandler;
  /**
   * Optional function to determine if the action is enabled for a specific item.
   * When returns `false`, the action is rendered as disabled (grayed out, not clickable).
   * When omitted or returns `true`, the action is enabled.
   */
  isEnabled?: (item: ContentListItem) => boolean;
}

/**
 * Action configuration - either a handler function (shorthand) or a full config object.
 *
 * @example
 * ```tsx
 * // Shorthand - just the handler
 * onEdit: (item) => navigateToEdit(item.id)
 *
 * // Full config - handler with isEnabled
 * onEdit: {
 *   handler: (item) => navigateToEdit(item.id),
 *   isEnabled: (item) => !item.isManaged,
 * }
 * ```
 */
export type ActionConfig = ActionHandler | ActionConfigObject;

/**
 * Configuration for a custom action.
 */
export interface CustomActionConfig {
  /** Unique identifier for the action. */
  id: string;
  /** Icon type from EUI icon set. */
  iconType: string;
  /** Human-readable label for the action. */
  label: string;
  /** Optional tooltip text. */
  tooltip?: string;
  /** Handler function when action is triggered. */
  handler: (item: ContentListItem) => void;
  /**
   * Optional function to determine if the action is enabled for a specific item.
   * When returns `false`, the action is rendered as disabled (grayed out, not clickable).
   * When omitted or returns `true`, the action is enabled.
   */
  isEnabled?: (item: ContentListItem) => boolean;
  /** Optional color for the action button. */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'text' | 'accent';
  /** Optional `data-test-subj` for testing. */
  'data-test-subj'?: string;
}

/**
 * Per-item configuration for link behavior and actions.
 * Works with `ContentListItem` (standardized format).
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   item={{
 *     getHref: (item) => `/app/dashboard/${item.id}`,
 *     actions: {
 *       // Shorthand - just the handler
 *       onClick: (item) => navigateTo(item.id),
 *       onDelete: (item) => confirmDelete(item),
 *       // Full config - handler with isEnabled
 *       onEdit: {
 *         handler: (item) => openEditor(item.id),
 *         isEnabled: (item) => !item.isManaged,
 *       },
 *     },
 *   }}
 * />
 * ```
 */
export interface ItemConfig {
  /**
   * Function to generate the href for an item link.
   * When provided, item titles become clickable links.
   */
  getHref?: (item: ContentListItem) => string;

  /** Item actions - interactive behaviors for individual items. */
  actions?: {
    /** Primary click/tap behavior when the row or title is clicked. */
    onClick?: ActionConfig;
    /** Edit action handler (renders pencil icon). */
    onEdit?: ActionConfig;
    /** View details action handler (renders controls icon). */
    onViewDetails?: ActionConfig;
    /** Duplicate action handler. */
    onDuplicate?: ActionConfig;
    /** Export action handler. */
    onExport?: ActionConfig;
    /** Delete action handler (renders with danger color). */
    onDelete?: ActionConfig;
    /** Custom actions with full metadata. */
    custom?: CustomActionConfig[];
  };
}
