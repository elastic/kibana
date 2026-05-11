/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Provider.
export { ContentListClientProvider } from './src/provider';
export type { ContentListClientProviderProps } from './src/provider';

// Strategy.
export { createClientStrategy } from './src/strategy';
export type { ClientStrategy } from './src/strategy';

// Content editor.
export type { ContentEditorConfig } from './src/content_editor';

// Types.
export type {
  ContentListClientServices,
  TableListViewFindItemsFn,
  TableListViewFindItemsOptions,
  TableListViewFindItemsResult,
  SavedObjectReference,
} from './src/types';

// Saved-object listing services — small, single-purpose helpers that build
// args for `ContentListClientProvider`. See `services/<area>/` and the
// README for how each helper maps to a `ContentListClientProviderProps`
// field.
export {
  createTagsService,
  type TagsApi,
  createFavoritesService,
  type FavoritesServiceOptions,
  createUserProfilesService,
  createContentInsightsService,
  type ContentInsightsServiceOptions,
  SavedObjectActivityRow,
  type SavedObjectActivityRowProps,
  createDuplicateTitleValidator,
  type DuplicateTitleValidatorOptions,
  type TitleValidator,
  useRecentlyAccessedDecoration,
  type RecentlyAccessedDecoration,
  type RecentDecoration,
  type DecorableFindItemsResult,
  RecentsFilterRenderer,
  type RecentsFilterRendererProps,
  type RecentlyAccessedEntry,
  type RecentlyAccessedHistorySource,
  withPerformanceMetrics,
  type PerformanceMetricsOptions,
} from './src/services';
