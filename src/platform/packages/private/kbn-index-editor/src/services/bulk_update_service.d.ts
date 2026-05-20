import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart } from '@kbn/core/public';
import type { AddDocAction, DeleteDocAction } from '../types';
export type BulkUpdateOperations = Array<AddDocAction | DeleteDocAction>;
export declare const BULK_UPDATE_CHUNK_SIZE = 500;
/**
 * Sends a bulk update request to an index.
 * @param updates
 */
export declare function bulkUpdate(indexName: string, updates: BulkUpdateOperations, http: HttpStart): Promise<{
    bulkOperations: Exclude<BulkRequest['operations'], undefined>;
    bulkResponse: BulkResponse;
}>;
