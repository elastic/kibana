/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import {
  createContextMock,
  createOutdatedDocumentSearchState,
  createSavedObjectRawDoc,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { OutdatedDocumentsSearchTransformState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchTransform } from './outdated_documents_search_transform';

describe('Stage: outdatedDocumentsSearchTransform', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchTransformState> = {}
  ): OutdatedDocumentsSearchTransformState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
    outdatedDocuments: [],
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX when outdated documents were converted', () => {
    const state = createState({
      progress: {
        processed: 0,
        total: 100,
      },
      outdatedDocuments: [
        createSavedObjectRawDoc({ _id: '1' }),
        createSavedObjectRawDoc({ _id: '2' }),
      ],
    });
    const processedDocs = [
      createSavedObjectRawDoc({ _id: '1' }),
      createSavedObjectRawDoc({ _id: '2' }),
    ];
    const res = Either.right({
      processedDocs,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM'>;

    const newState = outdatedDocumentsSearchTransform(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
      currentBatch: 0,
      hasTransformedDocs: true,
      bulkOperationBatches: expect.any(Array),
      progress: {
        processed: 2,
        total: 100,
      },
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_TRANSFORM -> OUTDATED_DOCUMENTS_SEARCH_READ in case of documents_transform_failed when discardCorruptObjects is false', () => {
    context = createContextMock({
      discardCorruptObjects: false,
    });
    const state = createState({
      progress: {
        processed: 0,
        total: 100,
      },
      outdatedDocuments: [
        createSavedObjectRawDoc({ _id: '1' }),
        createSavedObjectRawDoc({ _id: '2' }),
      ],
      corruptDocumentIds: ['init_1'],
    });
    const processedDocs = [
      createSavedObjectRawDoc({ _id: '3' }),
      createSavedObjectRawDoc({ _id: '4' }),
    ];
    const res: StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM'> = Either.left({
      type: 'documents_transform_failed',
      processedDocs,
      corruptDocumentIds: ['foo_1', 'bar_2'],
      transformErrors: [],
    });

    const newState = outdatedDocumentsSearchTransform(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
      corruptDocumentIds: ['init_1', 'foo_1', 'bar_2'],
      transformErrors: [],
      hasTransformedDocs: false,
      progress: {
        processed: 2,
        total: 100,
      },
    });
  });
});
