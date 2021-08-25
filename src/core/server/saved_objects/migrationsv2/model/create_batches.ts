/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { SavedObjectsRawDoc } from '../..';
import { createBulkOperationBody } from '../actions/bulk_overwrite_transformed_documents';

/**
 * Creates batches of documents to be used by the bulk API. Each batch will
 * have a request body content length that's <= batchSizeBytes
 */
export function createBatches(docs: SavedObjectsRawDoc[], index: string, batchSizeBytes: number) {
  /* To build up the NDJSON request body we construct an array of objects like:
   * [
   *   {"index": ...}
   *   {"title": "my saved object"}
   *   ...
   * ]
   * However, when we call JSON.stringify on this array the resulting string
   * will be surrounded by `[]` which won't be present in the NDJSON so these
   * two characters need to be removed from the size calculation.
   */
  const BRACKETS_BYTES = 2;
  /* NDJSON needs to be terminated by a newline, so we need to account for an
   * extra newline character at the end of each batch
   */
  const NDJSON_NEW_LINE_BYTES = 1;

  const batches = [[]] as [SavedObjectsRawDoc[]];
  let currBatch = 0;
  let currBatchSizeBytes = 0;
  for (const doc of docs) {
    const bulkOperationBody = createBulkOperationBody(doc, index);
    const docSizeBytes =
      Buffer.byteLength(JSON.stringify(bulkOperationBody), 'utf8') - BRACKETS_BYTES;
    if (docSizeBytes + NDJSON_NEW_LINE_BYTES > batchSizeBytes) {
      return Either.left({
        type: 'document_exceeds_batch_size_bytes',
        docSizeBytes: docSizeBytes + NDJSON_NEW_LINE_BYTES,
        batchSizeBytes,
        document: doc,
      });
    } else if (currBatchSizeBytes + docSizeBytes + NDJSON_NEW_LINE_BYTES <= batchSizeBytes) {
      batches[currBatch].push(doc);
      currBatchSizeBytes = currBatchSizeBytes + docSizeBytes;
    } else {
      currBatch++;
      batches[currBatch] = [doc];
      currBatchSizeBytes = docSizeBytes;
    }
  }

  return Either.right(batches);
}
