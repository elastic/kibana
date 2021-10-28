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
  const DOCUMENT_SIZE_BYTES = 128;
  const INDEX = '.kibana_version_index';
  it('returns right one batch if all documents fit in maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ²' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ®' } },
    ];

    expect(createBatches(documents, INDEX, DOCUMENT_SIZE_BYTES * 3)).toEqual(
      Either.right([documents])
    );
  });
  it('creates multiple batches with each batch limited to maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ²' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ®' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 44' } },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title 55' } },
    ];
    expect(createBatches(documents, INDEX, DOCUMENT_SIZE_BYTES * 2)).toEqual(
      Either.right([[documents[0], documents[1]], [documents[2], documents[3]], [documents[4]]])
    );
  });
  it('creates a single empty batch if there are no documents', () => {
    const documents = [] as SavedObjectsRawDoc[];
    expect(createBatches(documents, INDEX, 100)).toEqual(Either.right([[]]));
  });
  it('throws if any one document exceeds the maxBatchSizeBytes', () => {
    const documents = [
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
      {
        _id: '',
        _source: {
          type: 'dashboard',
          title: 'my saved object title ² with a very long title that exceeds max size bytes',
        },
      },
      { _id: '', _source: { type: 'dashboard', title: 'my saved object title ®' } },
    ];
    expect(createBatches(documents, INDEX, 178)).toEqual(
      Either.left({
        maxBatchSizeBytes: 178,
        docSizeBytes: 179,
        type: 'document_exceeds_batch_size_bytes',
        document: documents[1],
      })
    );
  });
});
