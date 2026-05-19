import type { IUiSettingsClient } from '@kbn/core/public';
export declare const DEFAULT_ROWS_PER_PAGE = 100;
export declare const ROWS_PER_PAGE_OPTIONS: number[];
export declare enum VIEW_MODE {
    DOCUMENT_LEVEL = "documents",
    AGGREGATED_LEVEL = "aggregated",
    PATTERN_LEVEL = "patterns"
}
export declare const getDefaultRowsPerPage: (uiSettings: IUiSettingsClient) => number;
export declare const ESQL_TRANSITION_MODAL_KEY = "data.textLangTransitionModal";
export declare const DISCOVER_QUERY_MODE_KEY = "discover.defaultQueryMode";
/**
 * The id value used to indicate that a link should open in a new Discover tab.
 * It will be used in the `_tab` URL param to indicate that a new tab should be created.
 * Once created, the new tab will have a unique id.
 */
export declare const NEW_TAB_ID: "new";
/**
 * The query param key used to store the Discover app state in the URL
 */
export declare const APP_STATE_URL_KEY = "_a";
export declare const GLOBAL_STATE_URL_KEY = "_g";
export declare const TAB_STATE_URL_KEY = "_tab";
/**
 * Product feature IDs
 */
export declare const TRACES_PRODUCT_FEATURE_ID = "discover:traces";
export declare const METRICS_EXPERIENCE_PRODUCT_FEATURE_ID = "discover:metrics-experience";
/**
 * When enabled, Discover search embeddable uses transformIn/transformOut to convert between
 * API format (DiscoverSessionEmbeddableState) and stored format (StoredSearchEmbeddableState).
 * When disabled, panel state is stored and loaded as-is (pre-transform behavior).
 */
export declare const EMBEDDABLE_TRANSFORMS_FEATURE_FLAG_KEY = "discover.embeddableTransforms";
