/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/**
 * {@link ContentListItem} fields that contain user UIDs.
 *
 * Used to seed the user-profile cache from fetched items and to resolve
 * display values typed into the query bar.
 */
export const USER_UID_FIELDS = ['createdBy'] as const;

/**
 * Sentinel filter key for managed items (e.g. bundled with a package).
 *
 * Used in `getCreatorKey`, filter facets, and field definitions to
 * distinguish managed items from real user-authored ones.
 */
export const MANAGED_USER_FILTER = '__managed__';

/**
 * Sentinel filter key for items with no `createdBy` value
 * (e.g. created via API or before Kibana 7.14).
 */
export const NO_CREATOR_USER_FILTER = '__no_creator__';

/** Display label for the {@link MANAGED_USER_FILTER} sentinel. */
export const MANAGED_USER_LABEL = i18n.translate(
  'contentManagement.contentList.createdBy.managedLabel',
  { defaultMessage: 'Managed' }
);

/** Display label for the {@link NO_CREATOR_USER_FILTER} sentinel. */
export const NO_CREATOR_USER_LABEL = i18n.translate(
  'contentManagement.contentList.createdBy.noCreatorLabel',
  { defaultMessage: 'No creator' }
);

/** The set of sentinel filter keys (not real user UIDs). */
export const SENTINEL_KEYS: ReadonlySet<string> = new Set([
  MANAGED_USER_FILTER,
  NO_CREATOR_USER_FILTER,
]);

/**
 * Resolve the effective creator key for an item.
 *
 * Maps `managed` items to {@link MANAGED_USER_FILTER} and items without a
 * `createdBy` to {@link NO_CREATOR_USER_FILTER}. All other items return
 * their `createdBy` UID. Direct `ContentListProvider` consumers should use
 * this when implementing `findItems` filtering against `createdBy` values,
 * which may contain sentinel keys.
 */
export const getCreatorKey = (item: { managed?: boolean; createdBy?: string }): string => {
  if (item.managed) {
    return MANAGED_USER_FILTER;
  }
  return item.createdBy ?? NO_CREATOR_USER_FILTER;
};

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
  /** Optional array of tag IDs associated with this item. */
  tags?: string[];
  /** Creation timestamp (ISO string). Used by the content editor. */
  createdAt?: string;
  /** User ID or profile ID of the item creator. Used by the content editor. */
  createdBy?: string;
  /** User ID or profile ID of the last editor. Used by the content editor. */
  updatedBy?: string;
  /** Whether this item is managed (system-owned). Used by the content editor. */
  managed?: boolean;
};

/**
 * Action identifiers known to the package.
 *
 * The package owns built-in action presets keyed by these IDs (`Action.Edit`,
 * `Action.Delete`, `Action.Inspect`). Consumers may also invent custom IDs;
 * see {@link ActionId}.
 */
export type KnownActionId = 'edit' | 'delete' | 'inspect';

/**
 * Identifier for an action.
 *
 * `KnownActionId | (string & {})` keeps IDE autocomplete on the known
 * IDs while still accepting any consumer-invented string (e.g.
 * `'archive'`). The opaque `string & {}` is the standard TypeScript
 * trick that prevents the union from collapsing to plain `string`.
 */
export type ActionId = KnownActionId | (string & {});

interface ActionConfigBase {
  /**
   * Per-item restriction. Returns a reason string when the action is
   * not permitted on the item; `undefined` otherwise. Drives row icon
   * disabling, selection-checkbox gating (when `onBulkAction` is set),
   * and the dialog partition.
   */
  restriction?: (item: ContentListItem) => string | undefined;
}

/**
 * Configuration for a single action.
 *
 * At least one of `onItemAction` or `onBulkAction` must be supplied.
 * Presence of `onBulkAction` makes the action bulk-eligible.
 */
export type ActionConfig =
  | (ActionConfigBase & {
      /** Single-item handler. */
      onItemAction: (item: ContentListItem) => void;
      /** Optional bulk handler. */
      onBulkAction?: (items: ContentListItem[]) => Promise<void>;
    })
  | (ActionConfigBase & {
      /** Optional single-item handler. */
      onItemAction?: (item: ContentListItem) => void;
      /** Bulk handler. */
      onBulkAction: (items: ContentListItem[]) => Promise<void>;
    });

/**
 * Action configuration map.
 *
 * Known IDs (`edit`/`delete`/`inspect`) are first-class fields;
 * consumers can also add custom action IDs via the index signature.
 */
export interface ContentListActions {
  /** Row-level edit. */
  edit?: ActionConfig;
  /** Bulk-eligible delete. */
  delete?: ActionConfig;
  /** Row-level inspect ("View details"). */
  inspect?: ActionConfig;
  /** Custom actions, identified by a consumer-chosen string ID. */
  [customId: string]: ActionConfig | undefined;
}

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
   * Action handlers and per-item restrictions, keyed by action ID.
   */
  actions?: ContentListActions;
}
