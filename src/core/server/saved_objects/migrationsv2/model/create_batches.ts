/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { SavedObjectsRawDoc } from '../..';

export function createBatches(docs: SavedObjectsRawDoc[], batchSizeBytes: number) {
  const batches = [[]] as [SavedObjectsRawDoc[]];
  let currBatch = 0;
  let currBatchSizeBytes = 0;
  for (const doc of docs) {
    const docSizeBytes = Buffer.byteLength(JSON.stringify(doc), 'utf8');
    if (docSizeBytes > batchSizeBytes) {
      return Either.left({
        type: 'document_exceeds_batch_size_bytes',
        docSizeBytes,
        batchSizeBytes,
        document: doc,
      });
    } else if (currBatchSizeBytes + docSizeBytes <= batchSizeBytes) {
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
