/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '@kbn/core-saved-objects-server';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { IndexTypesMap } from '@kbn/core-saved-objects-base-server-internal';
import {
  createBulkDeleteOperationBody,
  createBulkIndexOperationTuple,
  getTempIndexName,
} from './helpers';
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
export function buildTempIndexMap(
  indexTypesMap: IndexTypesMap,
  kibanaVersion: string
): Record<string, string> {
  return Object.entries(indexTypesMap || {}).reduce<Record<string, string>>(
    (acc, [indexAlias, types]) => {
      const tempIndex = getTempIndexName(indexAlias, kibanaVersion!) + '_alias';

      types.forEach((type) => {
        acc[type] = tempIndex;
      });
      return acc;
    },
    {}
  );
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
  typeIndexMap,
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
    const bulkIndexOperationBody = createBulkIndexOperationTuple(document, typeIndexMap);
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
