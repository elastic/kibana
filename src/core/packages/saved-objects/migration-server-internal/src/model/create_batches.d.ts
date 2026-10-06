/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as Either from 'fp-ts/Either';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TransformErrorObjects } from '../core';
export type BulkIndexOperationTuple = [BulkOperationContainer, SavedObjectsRawDocSource];
export type BulkOperation = BulkIndexOperationTuple | BulkOperationContainer;
export type BulkOperationBatch = BulkOperation[];
export interface CreateBatchesParams {
  documents: SavedObjectsRawDoc[];
  corruptDocumentIds?: string[];
  transformErrors?: TransformErrorObjects[];
  maxBatchSizeBytes: number;
}
export interface DocumentExceedsBatchSize {
  documentId: string;
  type: 'document_exceeds_batch_size_bytes';
  docSizeBytes: number;
  maxBatchSizeBytes: number;
}
/**
 * Creates batches of documents to be used by the bulk API. Each batch will
 * have a request body content length that's <= maxBatchSizeBytes
 */
export declare function createBatches({
  documents,
  corruptDocumentIds,
  transformErrors,
  maxBatchSizeBytes,
}: CreateBatchesParams): Either.Either<DocumentExceedsBatchSize, BulkOperation[][]>;
