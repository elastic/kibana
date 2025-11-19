/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchConfig } from './search';
import type { FilteringConfig } from './filtering';
import type { SortingConfig } from './sorting';
import type { PaginationConfig } from './pagination';
import type { SelectionActions } from './selection';
import type { GlobalActionsConfig } from './global_actions';
import type { AnalyticsConfig } from './analytics';
import type { ContentEditorConfig } from './content_editor';

/**
 * Feature configuration for content list behavior.
 *
 * Features are UI capabilities that can be enabled/disabled or configured.
 * Service-dependent features (starred, tags, userProfiles) are automatically enabled
 * when their corresponding services are provided. Set a feature to `false` to explicitly
 * disable it even when the service is available.
 */
export interface ContentListFeatures {
  /** Search functionality. Pass `true` for defaults or `SearchConfig` for customization. */
  search?: boolean | SearchConfig;
  /** Filtering functionality. Pass `true` for defaults or `FilteringConfig` for customization. */
  filtering?: boolean | FilteringConfig;
  /** Sorting functionality. Pass `true` for defaults or `SortingConfig` for customization. */
  sorting?: boolean | SortingConfig;
  /** Pagination functionality. Pass `true` for defaults or `PaginationConfig` for customization. */
  pagination?: boolean | PaginationConfig;
  /** Selection actions for bulk operations. */
  selection?: SelectionActions;
  /** Global actions configuration (e.g., create button). */
  globalActions?: GlobalActionsConfig;
  /** Analytics tracking configuration. */
  analytics?: AnalyticsConfig;
  /**
   * Starred items feature (uses `favorites` service).
   *
   * Enabled by default when `favorites` service is provided.
   * Set to `false` to disable even when the service is available.
   *
   * @example
   * ```tsx
   * // Disable starred feature even though favorites service is provided
   * features={{ starred: false }}
   * ```
   */
  starred?: boolean;
  /**
   * Tags feature (uses `tags` service).
   *
   * Enabled by default when `tags` service is provided.
   * Set to `false` to disable even when the service is available.
   *
   * @example
   * ```tsx
   * // Disable tags feature even though tags service is provided
   * features={{ tags: false }}
   * ```
   */
  tags?: boolean;
  /**
   * User profiles feature (uses `userProfile` service).
   *
   * Enabled by default when `userProfile` service is provided.
   * Set to `false` to disable even when the service is available.
   *
   * @example
   * ```tsx
   * // Disable user profiles feature even though userProfile service is provided
   * features={{ userProfiles: false }}
   * ```
   */
  userProfiles?: boolean;
  /**
   * Content editor configuration for metadata editing flyout.
   * When provided, auto-wires the "View details" action on items.
   *
   * - Pass `true` for automatic defaults (uses saved objects client for save).
   * - Pass `ContentEditorConfig` object to customize behavior.
   * - Pass `false` to disable even when core services are available.
   *
   * @example
   * ```tsx
   * // Minimal - automatic defaults
   * features={{ contentEditor: true }}
   *
   * // Custom configuration
   * features={{ contentEditor: { onSave: customHandler, ... } }}
   *
   * // Disable content editor
   * features={{ contentEditor: false }}
   * ```
   */
  contentEditor?: boolean | ContentEditorConfig;
}

/**
 * Service availability flags.
 *
 * These represent the resolved state of which features are actually available
 * and functional, based on service presence and feature configuration.
 */
export interface Supports {
  /** Whether starred items functionality is available. */
  starred: boolean;
  /** Whether tags functionality is available. */
  tags: boolean;
  /** Whether user profiles functionality is available. */
  userProfiles: boolean;
  /** Whether content editor functionality is available. */
  contentEditor: boolean;
  /** Whether content insights functionality is available. */
  contentInsights: boolean;
}
