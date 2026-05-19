export interface ESQLTelemetryCallbacks {
    onDecorationHoverShown?: (hoverMessage: string) => void;
    onSuggestionsWithCustomCommandShown?: (commandNames: string[]) => void;
    onSuggestionsReady?: (computeStart: number, computeEnd: number, queryLength: number, queryLines: number) => void;
}
export declare enum QuerySource {
    HISTORY = "history",
    STARRED = "starred",
    MANUAL = "manual",
    HELP = "help",
    AUTOCOMPLETE = "autocomplete",
    QUICK_SEARCH = "quick_search"
}
export interface TelemetryQuerySubmittedProps {
    source: QuerySource;
    query: string;
}
export declare enum ControlTriggerSource {
    SMART_SUGGESTION = "smart_suggestion",
    QUESTION_MARK = "question_mark",
    ADD_CONTROL_BTN = "add_control_btn"
}
export declare enum TelemetryControlCancelledReason {
    CANCEL_BUTTON = "cancel_button",
    CLOSE_BUTTON = "close_button"
}
export interface TelemetryLatencyProps {
    duration: number;
    queryLength: number;
    queryLines: number;
    sessionId: string;
    isInitialLoad?: boolean;
    callbacksDuration?: number;
}
