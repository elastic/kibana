/**
 * These triggers have been updated to use a more consistent naming schema that works with REST APIs.
 * They are generic events which can apply to many interactions in Kibana. Try to use these first when
 * building a new UI action.
 */
export declare const ON_CLICK_VALUE = "on_click_value";
export declare const ON_CLICK_IMAGE = "on_click_image";
export declare const ON_CLICK_ROW = "on_click_row";
export declare const ON_SELECT_RANGE = "on_select_range";
export declare const ON_APPLY_FILTER = "on_apply_filter";
export declare const ON_OPEN_PANEL_MENU = "on_open_panel_menu";
/**
 * These triggers have not yet been updated, and may be removed or consolidated later.
 */
export declare const ADD_PANEL_TRIGGER = "ADD_PANEL_TRIGGER";
export declare const ALERT_RULE_TRIGGER = "alertRule";
export declare const VISUALIZE_FIELD_TRIGGER = "VISUALIZE_FIELD_TRIGGER";
export declare const VISUALIZE_GEO_FIELD_TRIGGER = "VISUALIZE_GEO_FIELD_TRIGGER";
export declare const CONTROL_HOVER_TRIGGER_ID = "CONTROL_HOVER_TRIGGER";
export declare const CONTROL_MENU_TRIGGER = "CONTROL_MENU_TRIGGER";
export declare const EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID = "EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID";
export declare const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID = "SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID";
export declare const DISCOVER_CELL_ACTIONS_TRIGGER_ID = "DISCOVER_CELL_ACTIONS_TRIGGER_ID";
export declare const PANEL_BADGE_TRIGGER = "PANEL_BADGE_TRIGGER";
export declare const PANEL_NOTIFICATION_TRIGGER = "PANEL_NOTIFICATION_TRIGGER";
export declare const MULTI_VALUE_CLICK_TRIGGER = "MULTI_VALUE_CLICK_TRIGGER";
export declare const CELL_VALUE_TRIGGER = "CELL_VALUE_TRIGGER";
export declare const ESQL_CONTROL_TRIGGER = "ESQL_CONTROL_TRIGGER";
export declare const UPDATE_ESQL_QUERY_TRIGGER = "UPDATE_ESQL_QUERY_TRIGGER";
export declare const UPDATE_FILTER_REFERENCES_TRIGGER = "UPDATE_FILTER_REFERENCES_TRIGGER";
export declare const VISUALIZE_EDITOR_TRIGGER = "VISUALIZE_EDITOR_TRIGGER";
export declare const AGG_BASED_VISUALIZATION_TRIGGER = "AGG_BASED_VISUALIZATION_TRIGGER";
export declare const DASHBOARD_VISUALIZATION_PANEL_TRIGGER = "DASHBOARD_VISUALIZATION_PANEL_TRIGGER";
export declare const ADD_CANVAS_ELEMENT_TRIGGER = "ADD_CANVAS_ELEMENT_TRIGGER";
export declare const OPEN_FILE_UPLOAD_LITE_TRIGGER = "OPEN_FILE_UPLOAD_LITE_TRIGGER";
export declare const CATEGORIZE_FIELD_TRIGGER = "CATEGORIZE_FIELD_TRIGGER";
export declare const IN_APP_EMBEDDABLE_EDIT_TRIGGER = "IN_APP_EMBEDDABLE_EDIT_TRIGGER";
export declare const CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER = "CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER";
export declare const SWIM_LANE_SELECTION_TRIGGER = "SWIM_LANE_SELECTION_TRIGGER";
export declare const EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER = "EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER";
export declare const SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER = "SINGLE_METRIC_VIEWER_ENTITY_FIELD_SELECTION_TRIGGER";
export declare const O11Y_APM_TRANSACTION_CONTEXT_MENU_TRIGGER = "apmTransactionContextMenu";
export declare const O11Y_APM_ERROR_CONTEXT_MENU_TRIGGER = "apmErrorContextMenu";
export declare const SECURITY_ESQL_IN_TIMELINE_HISTOGRAM_TRIGGER = "security-discoverInTimeline-histogramTrigger";
export declare const SECURITY_CELL_ACTIONS_DEFAULT = "security-default-cellActions";
export declare const SECURITY_CELL_ACTIONS_DETAILS_FLYOUT = "security-detailsFlyout-cellActions";
export declare const SECURITY_CELL_ACTIONS_ALERTS_COUNT = "security-alertsCount-cellActions";
export declare const SECURITY_CELL_ACTIONS_CASE_EVENTS = "security-case-events-cellActions";
