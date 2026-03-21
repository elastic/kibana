import 'moment-timezone';
export declare const dateFormat = "MMM. D, YY HH:mm:ss";
/**
 * We store ES|QL queries in history based on storage size rather than a fixed count.
 * This allows for more queries when they're shorter, fewer when they're longer.
 */
export interface QueryHistoryItem {
    status?: 'success' | 'error' | 'warning';
    queryString: string;
    timeRan?: string;
}
export declare const getTrimmedQuery: (queryString: string) => string;
export declare const getHistoryItems: (sortDirection: "desc" | "asc") => QueryHistoryItem[];
export declare const getCachedQueries: () => QueryHistoryItem[];
/**
 * Get current storage usage statistics for debugging/monitoring
 */
export declare const getStorageStats: () => {
    queryCount: number;
    storageSizeKB: number;
    maxStorageLimitKB: number;
    storageUsagePercent: number;
};
export declare const addQueriesToCache: (itemToAddOrUpdate: QueryHistoryItem) => void;
