export declare enum AUTOCOMPLETE_EVENT_TYPE {
    CALL = "autocomplete:call",
    REQUEST = "autocomplete:req",
    RESULT = "autocomplete:res",
    ERROR = "autocomplete:err"
}
export interface AutocompleteUsageCollector {
    trackCall: () => Promise<void>;
    trackRequest: () => Promise<void>;
    trackResult: () => Promise<void>;
    trackError: () => Promise<void>;
}
