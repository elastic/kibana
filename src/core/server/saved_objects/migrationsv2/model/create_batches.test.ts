/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import { SavedObjectsRawDoc } from '../../serialization';
import { createBatches } from './create_batches';

describe('createBatches', () => {
  const DOCUMENT_SIZE_BYTES = 75;
  it('returns right single batch if all documents fit in maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 1' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 2' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 3' } },
    ];
    expect(createBatches(documents, DOCUMENT_SIZE_BYTES * 3)).toEqual(Either.right([documents]));
  });
  it('creates multiple batches with each batch limited to maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 1' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 2' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 3' } },
    ];
    expect(createBatches(documents, DOCUMENT_SIZE_BYTES + 1)).toEqual(
      Either.right([[documents[0]], [documents[1]], [documents[2]]])
    );
  });
  it('creates a single empty batch if there are no documents', () => {
    const documents = [] as SavedObjectsRawDoc[];
    expect(createBatches(documents, 100)).toEqual(Either.right([[]]));
  });
  it('throws if any one document exceeds the maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 1' } },
      {
        _id: '',
        _source: {
          type: 'dashboard',
          title: 'my saved object title 2 with a very long title that exceeds max size bytes',
        },
      },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 3' } },
    ];
    expect(createBatches(documents, 75)).toEqual(
      Either.left({
        batchSizeBytes: 75,
        docSizeBytes: 126,
        type: 'document_exceeds_batch_size_bytes',
        document: documents[1],
      })
    );
  });
});
