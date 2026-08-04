import type { EventTypeOpts } from '@elastic/ebt/client';
export declare const CASCADE_EVENT_TYPE = "discover_cascade";
export declare enum CascadeEventName {
    EXPANDED = "cascaded_documents_expanded",
    COLLAPSED = "cascaded_documents_collapsed",
    OPT_OUT = "cascaded_documents_opt_out",
    OPEN_IN_NEW_TAB_CLICKED = "cascaded_documents_open_in_new_tab_clicked"
}
export declare enum CascadeEventDataKeys {
    CASCADE_EVENT_NAME = "eventName",
    TAB_ID = "tabId",
    NODE_ID = "nodeId"
}
export interface CascadeEBTEvent {
    [CascadeEventDataKeys.CASCADE_EVENT_NAME]: CascadeEventName;
    [CascadeEventDataKeys.TAB_ID]: string;
    [CascadeEventDataKeys.NODE_ID]?: string;
}
export declare const cascadeEventType: EventTypeOpts<Record<string, unknown>>;
