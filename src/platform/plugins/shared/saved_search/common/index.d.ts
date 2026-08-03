export { getSavedSearchFullPathUrl } from './saved_searches_url';
export { extractTabs } from './service/extract_tabs';
export type { DiscoverGridSettings, DiscoverGridSettingsColumn, SavedSearch, SavedSearchAttributes, SavedSearchByValueAttributes, DiscoverSession, DiscoverSessionTab, } from './types';
export declare enum VIEW_MODE {
    DOCUMENT_LEVEL = "documents",
    AGGREGATED_LEVEL = "aggregated",
    PATTERN_LEVEL = "patterns"
}
export { SavedSearchType, SavedSearchTypeDisplayName, LATEST_VERSION, MIN_SAVED_SEARCH_SAMPLE_SIZE, MAX_SAVED_SEARCH_SAMPLE_SIZE, MAX_DISCOVER_SESSION_COLUMNS, MAX_DISCOVER_SESSION_COLUMNS_SERVERLESS, MAX_DISCOVER_SESSION_TABS, } from './constants';
export { fromDiscoverSessionAttributesToSavedSearch, toSavedSearchAttributes, } from './service/saved_searches_utils';
