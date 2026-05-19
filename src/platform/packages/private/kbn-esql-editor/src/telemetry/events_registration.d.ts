import type { AnalyticsServiceSetup } from '@kbn/core/public';
/**
 * Event types.
 */
export declare const ESQL_LOOKUP_JOIN_ACTION_SHOWN = "esql.lookup_action_shown";
export declare const ESQL_SUGGESTIONS_WITH_CUSTOM_COMMAND_SHOWN = "esql.suggestions_with_custom_command_shown";
export declare const ESQL_QUERY_HISTORY_OPENED = "esql.query_history_opened";
export declare const ESQL_QUERY_HISTORY_CLICKED = "esql.query_history_clicked";
export declare const ESQL_STARRED_QUERY_CLICKED = "esql.starred_query_clicked";
export declare const ESQL_QUERY_SUBMITTED = "esql.query_submitted";
export declare const ESQL_RECOMMENDED_QUERY_CLICKED = "esql.recommended_query_clicked";
export declare const ESQL_CONTROL_FLYOUT_OPENED = "esql.control_flyout_opened";
export declare const ESQL_CONTROL_CANCELLED = "esql.control_cancelled";
export declare const ESQL_CONTROL_SAVED = "esql.control_saved";
export declare const ESQL_RESOURCE_BROWSER_OPENED = "esql.resource_browser_opened";
export declare const ESQL_RESOURCE_BROWSER_ITEM_TOGGLED = "esql.resource_browser_item_toggled";
/**
 * Registers the esql editor analytics events.
 * This function is wrapped in `once` to ensure that the events are registered only once.
 */
export declare const registerESQLEditorAnalyticsEvents: (analytics: AnalyticsServiceSetup) => void;
