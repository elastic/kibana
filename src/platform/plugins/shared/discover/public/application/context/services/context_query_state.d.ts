import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
export interface ContextFetchState {
    /**
     * Documents listed before anchor
     */
    predecessors: DataTableRecord[];
    /**
     * Documents after anchor
     */
    successors: DataTableRecord[];
    /**
     * Anchor document
     */
    anchor: DataTableRecord;
    /**
     * Anchor fetch status
     */
    anchorStatus: LoadingStatusEntry;
    /**
     * Predecessors fetch status
     */
    predecessorsStatus: LoadingStatusEntry;
    /**
     * Successors fetch status
     */
    successorsStatus: LoadingStatusEntry;
    /**
     * Intercepted warnings for anchor request
     */
    anchorInterceptedWarnings: SearchResponseWarning[] | undefined;
    /**
     * Intercepted warnings for predecessors request
     */
    predecessorsInterceptedWarnings: SearchResponseWarning[] | undefined;
    /**
     * Intercepted warnings for successors request
     */
    successorsInterceptedWarnings: SearchResponseWarning[] | undefined;
}
export declare enum LoadingStatus {
    FAILED = "failed",
    LOADED = "loaded",
    LOADING = "loading",
    UNINITIALIZED = "uninitialized"
}
export declare enum FailureReason {
    UNKNOWN = "unknown",
    INVALID_TIEBREAKER = "invalid_tiebreaker"
}
export interface LoadingStatusEntry {
    value: LoadingStatus;
    error?: Error;
    reason?: FailureReason;
}
export declare const getInitialContextQueryState: () => ContextFetchState;
