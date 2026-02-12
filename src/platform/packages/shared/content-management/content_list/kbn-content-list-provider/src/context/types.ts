/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceConfig } from '../datasource';
import type { ContentListItemConfig } from '../item';

/**
 * Identity configuration for content lists.
 *
 * At least one of `id` or `queryKeyScope` must be provided:
 *
 * - **`id` only**: `queryKeyScope` is derived as `${id}-listing`. Use when you want a simple
 *   identifier that also serves as the cache key base.
 *
 * - **`queryKeyScope` only**: Use when you only need cache isolation without a semantic identifier.
 *
 * - **Both**: `queryKeyScope` is used for caching/persistence, `id` is available for other
 *   purposes (e.g., `data-test-subj`, analytics).
 */
export type ContentListIdentity =
  | { id: string; queryKeyScope?: string }
  | { id?: string; queryKeyScope: string };

/**
 * User-facing labels for the content type.
 *
 * These should be i18n-translated strings for display in the UI.
 *
 * @example
 * ```ts
 * labels: {
 *   entity: i18n.translate('myPlugin.listing.entityName', { defaultMessage: 'dashboard' }),
 *   entityPlural: i18n.translate('myPlugin.listing.entityNamePlural', { defaultMessage: 'dashboards' }),
 * }
 * ```
 */
export interface ContentListLabels {
  /** Singular form of the entity name (e.g., "dashboard"). Should be i18n-translated. */
  entity: string;
  /** Plural form of the entity name (e.g., "dashboards"). Should be i18n-translated. */
  entityPlural: string;
}

/**
 * Base configuration fields shared by all content list variants.
 * @internal
 */
interface ContentListCoreConfigBase {
  /** User-facing labels for the content type. Should be i18n-translated strings. */
  labels: ContentListLabels;
  /** Optional, per-item configuration. */
  item?: ContentListItemConfig;
  /** When `true`, disables selection and editing actions. */
  isReadOnly?: boolean;
}

/**
 * Core configuration - entity metadata and base settings.
 */
export type ContentListCoreConfig = ContentListCoreConfigBase & ContentListIdentity;

/**
 * Complete configuration for a content list.
 *
 * @template T The raw item type from the datasource (defaults to `UserContentCommonSchema`).
 */
export type ContentListConfig = ContentListCoreConfig & {
  dataSource: DataSourceConfig;
};

/**
 * Services provided to the content list provider to enable additional capabilities.
 *
 * @internal This interface is a placeholder for future service integrations.
 * @remarks
 * Planned services include:
 * - Tagging service for tag-based filtering.
 * - Favorites service for user favorites.
 * - Permissions service for access control.
 *
 * This interface is not yet used and may change without notice.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentListServices {
  // Future services will be added here.
}
