import type { AnalyticsServiceSetup } from '@kbn/core/public';
/**
 * Event types.
 */
export declare const INDEX_EDITOR_FLYOUT_OPENED_EVENT_TYPE = "index_editor.flyout_opened";
export declare const INDEX_EDITOR_SAVE_SUBMITTED_EVENT_TYPE = "index_editor.save_submitted";
export declare const INDEX_EDITOR_DATA_INTERACTION_EVENT_TYPE = "index_editor.data_interaction";
export declare const INDEX_EDITOR_CLICK_QUERY_THIS_INDEX_EVENT_TYPE = "index_editor.query_this_index_clicked";
export declare const INDEX_EDITOR_RESET_INDEX_EVENT_TYPE = "index_editor.reset_index";
/**
 * Registers the index editor analytics events.
 * This function is wrapped in `once` to ensure that the events are registered only once.
 */
export declare const registerIndexEditorAnalyticsEvents: (analytics: AnalyticsServiceSetup) => void;
