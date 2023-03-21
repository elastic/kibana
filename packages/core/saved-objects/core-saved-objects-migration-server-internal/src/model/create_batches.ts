/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import { createBulkDeleteOperationBody, createBulkIndexOperationTuple } from './helpers';
import type { TransformErrorObjects } from '../core';

export type BulkIndexOperationTuple = [BulkOperationContainer, SavedObjectsRawDocSource];
export type BulkOperation = BulkIndexOperationTuple | BulkOperationContainer;

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
export function createBatches({
  documents,
  corruptDocumentIds = [],
  transformErrors = [],
  maxBatchSizeBytes,
}: CreateBatchesParams): Either.Either<DocumentExceedsBatchSize, BulkOperation[][]> {
  /* To build up the NDJSON request body we construct an array of objects like:
   * [
   *   {"index": ...}
   *   {"title": "my saved object"}
   *   {"delete": ...}
   *   {"delete": ...}
   *   ...
   * ]
   * For indexing operations, createBulkIndexOperationTuple
   * returns a tuple of the form [{operation, id}, {document}]
   * Thus, for batch size calculations, we must take into account
   * that this tuple's surrounding brackets `[]` won't be present in the NDJSON
   */
  const BRACKETS_BYTES = 2;
  /* Each document in the NDJSON (including the last one) needs to be
   * terminated by a newline, so we need to account for an extra newline
   * character
   */
  const NDJSON_NEW_LINE_BYTES = 1;

  const BASE_DELETE_OPERATION_SIZE = Buffer.byteLength(
    JSON.stringify(createBulkDeleteOperationBody('')),
    'utf8'
  );

  const batches: BulkOperation[][] = [[]];
  let currBatch = 0;
  let currBatchSizeBytes = 0;

  // group operations in batches of at most maxBatchSize
  const assignToBatch = (
    operation: BulkOperationContainer | BulkIndexOperationTuple,
    operationSizeBytes: number
  ): boolean => {
    operationSizeBytes += NDJSON_NEW_LINE_BYTES;

    if (operationSizeBytes > maxBatchSizeBytes) {
      // the current operation (+ payload) does not even fit a single batch, fail!
      return false;
    } else if (currBatchSizeBytes + operationSizeBytes <= maxBatchSizeBytes) {
      batches[currBatch].push(operation);
      currBatchSizeBytes = currBatchSizeBytes + operationSizeBytes;
    } else {
      currBatch++;
      batches[currBatch] = [operation];
      currBatchSizeBytes = operationSizeBytes;
    }
    return true;
  };

  // create index (update) operations for all transformed documents
  for (const document of documents) {
    const bulkIndexOperationBody = createBulkIndexOperationTuple(document);
    // take into account that this tuple's surrounding brackets `[]` won't be present in the NDJSON
    const docSizeBytes =
      Buffer.byteLength(JSON.stringify(bulkIndexOperationBody), 'utf8') - BRACKETS_BYTES;
    if (!assignToBatch(bulkIndexOperationBody, docSizeBytes)) {
      return Either.left({
        documentId: document._id,
        type: 'document_exceeds_batch_size_bytes' as const,
        docSizeBytes,
        maxBatchSizeBytes,
      });
    }
  }

  // create delete operations for all corrupt documents + transform errors
  const unwantedDocumentIds = [
    ...corruptDocumentIds,
    ...transformErrors.map(({ rawId: documentId }) => documentId),
  ];

  for (const documentId of unwantedDocumentIds) {
    const bulkDeleteOperationBody = createBulkDeleteOperationBody(documentId);
    const docSizeBytes = BASE_DELETE_OPERATION_SIZE + Buffer.byteLength(documentId, 'utf8');
    if (!assignToBatch(bulkDeleteOperationBody, docSizeBytes)) {
      return Either.left({
        documentId,
        type: 'document_exceeds_batch_size_bytes' as const,
        docSizeBytes,
        maxBatchSizeBytes,
      });
    }
  }

  return Either.right(batches);
}
