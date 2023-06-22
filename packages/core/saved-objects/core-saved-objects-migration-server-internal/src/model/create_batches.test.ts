/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as Either from 'fp-ts/lib/Either';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { buildTempIndexMap, createBatches } from './create_batches';

describe('createBatches', () => {
  const documentToOperation = (document: SavedObjectsRawDoc) => [
    { index: { _id: document._id } },
    document._source,
  ];

  const DOCUMENT_SIZE_BYTES = 77; // 76 + \n

  describe('when indexTypesMap and kibanaVersion are not provided', () => {
    it('returns right one batch if all documents fit in maxBatchSizeBytes', () => {
      const documents = [
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ²' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ®' } },
      ];

      expect(
        createBatches({
          documents,
          maxBatchSizeBytes: DOCUMENT_SIZE_BYTES * 3,
        })
      ).toEqual(Either.right([documents.map(documentToOperation)]));
    });
    it('creates multiple batches with each batch limited to maxBatchSizeBytes', () => {
      const documents = [
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ²' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ®' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title 44' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title 55' } },
      ];
      expect(
        createBatches({
          documents,
          maxBatchSizeBytes: DOCUMENT_SIZE_BYTES * 2,
        })
      ).toEqual(
        Either.right([
          documents.slice(0, 2).map(documentToOperation),
          documents.slice(2, 4).map(documentToOperation),
          documents.slice(4).map(documentToOperation),
        ])
      );
    });
    it('creates a single empty batch if there are no documents', () => {
      const documents = [] as SavedObjectsRawDoc[];
      expect(createBatches({ documents, maxBatchSizeBytes: 100 })).toEqual(Either.right([[]]));
    });
    it('throws if any one document exceeds the maxBatchSizeBytes', () => {
      const documents = [
        { _id: 'foo', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
        {
          _id: 'bar',
          _source: {
            type: 'dashboard',
            title: 'my saved object title ² with a very long title that exceeds max size bytes',
          },
        },
        { _id: 'baz', _source: { type: 'dashboard', title: 'my saved object title ®' } },
      ];
      expect(createBatches({ documents, maxBatchSizeBytes: 120 })).toEqual(
        Either.left({
          maxBatchSizeBytes: 120,
          docSizeBytes: 130,
          type: 'document_exceeds_batch_size_bytes',
          documentId: documents[1]._id,
        })
      );
    });
  });

  describe('when a type index map is provided', () => {
    it('creates batches that contain the target index information for each type', () => {
      const documents = [
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ¹' } },
        { _id: '', _source: { type: 'dashboard', title: 'my saved object title ²' } },
        { _id: '', _source: { type: 'cases', title: 'a case' } },
        { _id: '', _source: { type: 'cases-comments', title: 'a case comment #1' } },
        { _id: '', _source: { type: 'cases-user-actions', title: 'a case user action' } },
      ];
      expect(
        createBatches({
          documents,
          maxBatchSizeBytes: (DOCUMENT_SIZE_BYTES + 43) * 2, // add extra length for 'index' property
          typeIndexMap: buildTempIndexMap(
            {
              '.kibana': ['dashboard'],
              '.kibana_cases': ['cases', 'cases-comments', 'cases-user-actions'],
            },
            '8.8.0'
          ),
        })
      ).toEqual(
        Either.right([
          [
            [
              {
                index: {
                  _id: '',
                  _index: '.kibana_8.8.0_reindex_temp',
                },
              },
              { type: 'dashboard', title: 'my saved object title ¹' },
            ],
            [
              {
                index: {
                  _id: '',
                  _index: '.kibana_8.8.0_reindex_temp',
                },
              },
              { type: 'dashboard', title: 'my saved object title ²' },
            ],
          ],
          [
            [
              {
                index: {
                  _id: '',
                  _index: '.kibana_cases_8.8.0_reindex_temp',
                },
              },
              { type: 'cases', title: 'a case' },
            ],
            [
              {
                index: {
                  _id: '',
                  _index: '.kibana_cases_8.8.0_reindex_temp',
                },
              },
              { type: 'cases-comments', title: 'a case comment #1' },
            ],
          ],
          [
            [
              {
                index: {
                  _id: '',
                  _index: '.kibana_cases_8.8.0_reindex_temp',
                },
              },
              { type: 'cases-user-actions', title: 'a case user action' },
            ],
          ],
        ])
      );
    });
  });
});
