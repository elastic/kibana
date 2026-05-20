export interface MetricsTracker {
    count: (eventName: string) => void;
    load: (eventName: string) => void;
}
export interface ESRequest {
    method: string;
    endpoint: string;
    data?: string;
}
export type BaseResponseType = 'application/json' | 'text/csv' | 'text/tab-separated-values' | 'text/plain' | 'application/yaml' | 'unknown' | 'application/vnd.mapbox-vector-tile';
export declare enum RestoreMethod {
    RESTORE = 1,
    RESTORE_AND_EXECUTE = 2
}
export interface RequestToRestore {
    request: string;
    restoreMethod?: RestoreMethod;
}
