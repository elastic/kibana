/**
 * Shared "Open in a Discover tab" label, used by any consumer that surfaces a
 * navigation affordance to Discover (currently unified-doc-viewer's traces flyout
 * and unified-chart-section-viewer's metrics-grid Lens action). Centralized here
 * rather than in a UI library to avoid an inverted dependency where chart code
 * pulls in the doc-viewer package solely to read a string.
 */
export declare const OPEN_IN_DISCOVER_TAB_LABEL: string;
export declare const CONTEXT_DEFAULT_SIZE_SETTING = "context:defaultSize";
export declare const CONTEXT_STEP_SETTING = "context:step";
export declare const CONTEXT_TIE_BREAKER_FIELDS_SETTING = "context:tieBreakerFields";
export declare const DEFAULT_COLUMNS_SETTING = "defaultColumns";
export declare const DOC_HIDE_TIME_COLUMN_SETTING = "doc_table:hideTimeColumn";
export declare const FIELDS_LIMIT_SETTING = "fields:popularLimit";
export declare const HIDE_ANNOUNCEMENTS = "hideAnnouncements";
export declare const IS_ESQL_DEFAULT_FEATURE_FLAG_KEY = "discover.isEsqlDefault";
export declare const MAX_DOC_FIELDS_DISPLAYED = "discover:maxDocFieldsDisplayed";
export declare const MODIFY_COLUMNS_ON_SWITCH = "discover:modifyColumnsOnSwitch";
export declare const ROW_HEIGHT_OPTION = "discover:rowHeightOption";
export declare const SAMPLE_ROWS_PER_PAGE_SETTING = "discover:sampleRowsPerPage";
export declare const SAMPLE_SIZE_SETTING = "discover:sampleSize";
export declare const SEARCH_EMBEDDABLE_TYPE = "discover_session";
export declare const SEARCH_ON_PAGE_LOAD_SETTING = "discover:searchOnPageLoad";
export declare const SHOW_FIELD_STATISTICS = "discover:showFieldStatistics";
export declare const SHOW_MULTIFIELDS = "discover:showMultiFields";
export declare const SORT_DEFAULT_ORDER_SETTING = "discover:sort:defaultOrder";
export declare enum DataGridDensity {
    COMPACT = "compact",
    EXPANDED = "expanded",
    NORMAL = "normal"
}
