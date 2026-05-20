/**
 * Return type for the hook
 */
export interface UseFetchMoreRecordsResult {
    isMoreDataLoading: boolean;
    totalHits: number;
    onFetchMoreRecords: (() => void) | undefined;
}
/**
 * Checks if more records can be loaded and returns a handler for it
 */
export declare const useFetchMoreRecords: () => UseFetchMoreRecordsResult;
