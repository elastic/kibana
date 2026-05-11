/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Helpers for `services.tags`.
export { createTagsService, type TagsApi } from './tags';

// Helpers for `services.favorites`.
export { createFavoritesService, type FavoritesServiceOptions } from './favorites';

// Helpers for `services.userProfiles`.
export { createUserProfilesService } from './user_profiles';

// Helpers for `contentEditor.appendRows` (activity row).
export {
  createContentInsightsService,
  type ContentInsightsServiceOptions,
  SavedObjectActivityRow,
  type SavedObjectActivityRowProps,
} from './content_insights';

// Helpers for `contentEditor.customValidators`.
export {
  createDuplicateTitleValidator,
  type DuplicateTitleValidatorOptions,
  type TitleValidator,
} from './duplicate_title';

// Helpers for `findItems` decoration + `features.flags` (recently-accessed).
export {
  useRecentlyAccessedDecoration,
  type RecentlyAccessedDecoration,
  type RecentDecoration,
  type DecorableFindItemsResult,
  RecentsFilterRenderer,
  type RecentsFilterRendererProps,
  type RecentlyAccessedEntry,
  type RecentlyAccessedHistorySource,
} from './recently_accessed';

// Helpers for wrapping `findItems` / `onDelete` with EBT performance metrics.
export { withPerformanceMetrics, type PerformanceMetricsOptions } from './performance_metrics';
