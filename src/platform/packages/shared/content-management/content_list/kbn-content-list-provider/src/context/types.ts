/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ContentManagementTagsServices } from '@kbn/content-management-tags';
import type { FavoritesServices } from '@kbn/content-management-favorites-public';
import type { UserProfilesServices } from '@kbn/content-management-user-profiles';
import type { CoreStart } from '@kbn/core/public';
import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { DataSourceConfig } from '../datasource';
import type { ItemConfig } from '../item';
import type { TransformFunction } from '../item';
import type { ContentListFeatures } from '../features';

/**
 * Core configuration - entity metadata and base settings.
 * No generic needed - these settings are datasource-agnostic.
 */
export interface ContentListCoreConfig {
  /** Singular name for the entity type (e.g., "dashboard", "visualization"). */
  entityName: string;
  /** Plural name for the entity type (e.g., "dashboards", "visualizations"). */
  entityNamePlural: string;
  /** Per-item configuration for links and actions. */
  item?: ItemConfig;
  /** When `true`, disables selection and editing actions. */
  isReadOnly?: boolean;
  /**
   * Unique scope identifier for React Query cache keys.
   *
   * **Caching behavior:**
   * - If not provided, an auto-generated unique ID (`useId()`) is used, which prevents
   *   cache collisions but also means caches are NOT shared across component remounts.
   * - If you want to share cache across navigations (e.g., user leaves and returns to the
   *   same listing page), provide a stable `queryKeyScope` like `"dashboard-listing"`.
   * - If you have multiple content lists with the same `entityName` but different data sources,
   *   provide different `queryKeyScope` values to prevent cache collisions.
   *
   * **When to provide explicitly:**
   * - Cross-navigation caching: Provide a stable scope to reuse cache when user returns.
   * - Multiple lists of same type: Provide different scopes to isolate caches.
   *
   * **When to omit:**
   * - Single list per entity type with no cross-navigation needs.
   * - Test/Storybook contexts where cache isolation is preferred.
   *
   * @example
   * ```tsx
   * // Cross-navigation caching: cache persists when user navigates away and back.
   * <ContentListProvider
   *   entityName="dashboard"
   *   queryKeyScope="dashboard-listing"
   *   dataSource={...}
   * />
   *
   * // Multiple lists: use different scopes to isolate caches.
   * <ContentListProvider entityName="dashboard" queryKeyScope="my-dashboards" dataSource={...} />
   * <ContentListProvider entityName="dashboard" queryKeyScope="shared-dashboards" dataSource={...} />
   * ```
   */
  queryKeyScope?: string;
}

/**
 * Complete configuration for content list.
 * @template T The raw item type from the datasource (defaults to `UserContentCommonSchema`).
 *
 * Generic is only needed for `dataSource` - all other config works with transformed `ContentListItem`.
 */
export type ContentListConfig<T = UserContentCommonSchema> = ContentListCoreConfig & {
  dataSource: DataSourceConfig<T>;
};

/**
 * Services for the content list provider.
 *
 * For Kibana providers: `core` is required, `favorites` is optional.
 * `tags` and `userProfile` are derived from Kibana dependencies
 * (`savedObjectsTagging` and `core.userProfile`) and should not be provided in the services prop.
 *
 * For the base `ContentListProvider`: all services are optional and can be provided directly.
 */
export interface ContentListServices {
  /** Core Kibana services. Required for Kibana providers. */
  core?: CoreStart;
  /** Favorites service for favorite items functionality. */
  favorites?: FavoritesServices;
  /** Tags service for tag filtering and management. Derived from `savedObjectsTagging` in Kibana providers. */
  tags?: ContentManagementTagsServices;
  /** User profile service for user filtering and display. Derived from `core.userProfile` in Kibana providers. */
  userProfile?: UserProfilesServices;
}

/**
 * Services for Kibana providers.
 * `core` and `savedObjectsTagging` are required. `tags` and `userProfile` are derived
 * from Kibana dependencies and should not be provided in the services prop.
 */
export type ContentListKibanaServices = ContentListServices & {
  /** Core Kibana services. Required for Kibana providers. */
  core: CoreStart;
  /** Saved objects tagging API. Required for Kibana providers. Used to derive `tags` service. */
  savedObjectsTagging: {
    ui: Pick<
      SavedObjectsTaggingApiUi,
      'getTagList' | 'parseSearchQuery' | 'getSearchBarFilter' | 'getTagIdFromName'
    >;
  };
};

/**
 * Base props shared by all Kibana providers.
 * @template T The item type from the datasource.
 */
export interface ContentListKibanaProviderBaseProps<T = UserContentCommonSchema>
  extends ContentListCoreConfig {
  /** The saved object type to fetch. */
  savedObjectType: string;
  /**
   * Optional transform function to convert raw items to the expected format.
   * Default transform is applied for `UserContentCommonSchema`-compatible types.
   */
  transform?: TransformFunction<T>;
  /**
   * Services for the provider.
   * `core` and `savedObjectsTagging` are required. `tags` and `userProfile` are derived
   * from `savedObjectsTagging` and `core.userProfile` respectively.
   */
  services: ContentListKibanaServices;
  /**
   * Feature configuration for enabling/customizing capabilities.
   *
   * Service-dependent features (starred, tags, userProfiles) are automatically enabled
   * when their corresponding services are provided. Set a feature to `false` to explicitly
   * disable it even when the service is available.
   *
   * @example
   * ```tsx
   * // Tags service is provided via savedObjectsTagging, but tags feature is disabled.
   * <ContentListServerKibanaProvider
   *   services={{ core: coreStart, savedObjectsTagging }}
   *   features={{ tags: false }}
   * >
   * ```
   */
  features?: ContentListFeatures;
}
