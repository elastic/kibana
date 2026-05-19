import * as Either from 'fp-ts/Either';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import type { TransformErrorObjects } from '../core';
export type BulkIndexOperationTuple = [BulkOperationContainer, SavedObjectsRawDocSource];
export type BulkOperation = BulkIndexOperationTuple | BulkOperationContainer;
export type BulkOperationBatch = BulkOperation[];
export interface CreateBatchesParams {
    documents: SavedObjectsRawDoc[];
    corruptDocumentIds?: string[];
    transformErrors?: TransformErrorObjects[];
    maxBatchSizeBytes: number;
    /** This map holds a list of temporary index names for each SO type, e.g.:
     * 'cases': '.kibana_cases_8.8.0_reindex_temp'
     * 'task': '.kibana_task_manager_8.8.0_reindex_temp'
     * ...
     */
    typeIndexMap?: Record<string, string>;
}
export interface DocumentExceedsBatchSize {
    documentId: string;
    type: 'document_exceeds_batch_size_bytes';
    docSizeBytes: number;
    maxBatchSizeBytes: number;
}
/**
 * Build a relationship of temporary index names for each SO type, e.g.:
 *  'cases': '.kibana_cases_8.8.0_reindex_temp'
 *  'task': '.kibana_task_manager_8.8.0_reindex_temp'
 *   ...
 *
 * @param indexTypesMap information about which types are stored in each index
 * @param kibanaVersion the target version of the indices
 */
export declare function buildTempIndexMap(indexTypesMap: IndexTypesMap, kibanaVersion: string): Record<string, string>;
/**
 * Creates batches of documents to be used by the bulk API. Each batch will
 * have a request body content length that's <= maxBatchSizeBytes
 */
export declare function createBatches({ documents, corruptDocumentIds, transformErrors, maxBatchSizeBytes, typeIndexMap, }: CreateBatchesParams): Either.Either<DocumentExceedsBatchSize, BulkOperation[][]>;
