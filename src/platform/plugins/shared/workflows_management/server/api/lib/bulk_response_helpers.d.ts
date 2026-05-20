import type { estypes } from '@elastic/elasticsearch';
/**
 * Extracts a human-readable error string from an ES bulk response error cause.
 */
export declare const extractBulkItemError: (error: estypes.ErrorCause | string | undefined) => string;
interface BulkResultItem {
    index?: {
        _id?: string | null;
        status?: number;
        error?: estypes.ErrorCause;
    };
    create?: {
        _id?: string | null;
        status?: number;
        error?: estypes.ErrorCause;
    };
}
/**
 * Partitions ES bulk response items into successful IDs and failure entries.
 * Works for both `index` and `create` operations.
 */
export declare const partitionBulkResults: (items: BulkResultItem[]) => {
    successIds: string[];
    failures: Array<{
        id: string;
        error: string;
    }>;
};
export {};
