export { createTagsService, type TagsApi } from './tags';
export { createFavoritesService, type FavoritesServiceOptions } from './favorites';
export { createUserProfilesService } from './user_profiles';
export { createContentInsightsService, type ContentInsightsServiceOptions, SavedObjectActivityRow, type SavedObjectActivityRowProps, } from './content_insights';
export { createDuplicateTitleValidator, type DuplicateTitleValidatorOptions, type TitleValidator, } from './duplicate_title';
export { useRecentlyAccessedDecoration, type RecentlyAccessedDecoration, type RecentDecoration, type DecorableFindItemsResult, RecentsFilterRenderer, type RecentsFilterRendererProps, type RecentlyAccessedEntry, type RecentlyAccessedHistorySource, } from './recently_accessed';
export { withPerformanceMetrics, type PerformanceMetricsOptions } from './performance_metrics';
