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
import type { TransformErrorObjects } from '../core';

export type BulkIndexOperationTuple = [BulkOperationContainer, SavedObjectsRawDocSource];
export type BulkOperation = BulkIndexOperationTuple | BulkOperationContainer;

/**
 * Given a document, creates a valid body to index the document using the Bulk API.
 */
const createBulkIndexOperationTuple = (doc: SavedObjectsRawDoc): BulkIndexOperationTuple => {
  return [
    {
      index: {
        _id: doc._id,
        // use optimistic concurrency control to ensure that outdated
        // documents are only overwritten once with the latest version
        ...(typeof doc._seq_no !== 'undefined' && { if_seq_no: doc._seq_no }),
        ...(typeof doc._primary_term !== 'undefined' && { if_primary_term: doc._primary_term }),
      },
    },
    doc._source,
  ];
};

/**
 * Given a document id, creates a valid body to delete the document using the Bulk API.
 */
const createBulkDeleteOperationBody = (_id: string): BulkOperationContainer => ({
  delete: { _id },
});

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

  const batches: BulkOperation[][] = [[]];
  let currBatch = 0;
  let currBatchSizeBytes = 0;

  const assignToBatch = (
    documentId: string,
    operation: BulkOperationContainer | BulkIndexOperationTuple,
    operationSizeBytes: number
  ): boolean => {
    operationSizeBytes += NDJSON_NEW_LINE_BYTES;

    if (operationSizeBytes > maxBatchSizeBytes) {
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

  for (const document of documents) {
    const bulkIndexOperationBody = createBulkIndexOperationTuple(document);
    // take into account that this tuple's surrounding brackets `[]` won't be present in the NDJSON
    const docSizeBytes =
      Buffer.byteLength(JSON.stringify(bulkIndexOperationBody), 'utf8') - BRACKETS_BYTES;
    if (!assignToBatch(document._id, bulkIndexOperationBody, docSizeBytes)) {
      return Either.left({
        documentId: document._id,
        type: 'document_exceeds_batch_size_bytes' as const,
        docSizeBytes,
        maxBatchSizeBytes,
      });
    }
  }

  corruptDocumentIds.forEach((documentId) => {
    const bulkDeleteOperationBody = createBulkDeleteOperationBody(documentId);
    const docSizeBytes = Buffer.byteLength(JSON.stringify(bulkDeleteOperationBody), 'utf8');
    if (!assignToBatch(documentId, bulkDeleteOperationBody, docSizeBytes)) {
      return Either.left({
        documentId,
        type: 'document_exceeds_batch_size_bytes' as const,
        docSizeBytes,
        maxBatchSizeBytes,
      });
    }
  });

  transformErrors.forEach(({ rawId: documentId }) => {
    const bulkDeleteOperationBody = createBulkDeleteOperationBody(documentId);
    const docSizeBytes = Buffer.byteLength(JSON.stringify(bulkDeleteOperationBody), 'utf8');
    if (!assignToBatch(documentId, bulkDeleteOperationBody, docSizeBytes)) {
      return Either.left({
        documentId,
        type: 'document_exceeds_batch_size_bytes' as const,
        docSizeBytes,
        maxBatchSizeBytes,
      });
    }
  });
  return Either.right(batches);
}
