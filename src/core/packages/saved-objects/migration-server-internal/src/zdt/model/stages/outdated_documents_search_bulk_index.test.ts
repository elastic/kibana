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
  type MockedMigratorContext,
} from '../../test_helpers';
import type { OutdatedDocumentsSearchBulkIndexState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchBulkIndex } from './outdated_documents_search_bulk_index';

describe('Stage: outdatedDocumentsSearchBulkIndex', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchBulkIndexState> = {}
  ): OutdatedDocumentsSearchBulkIndexState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
    bulkOperationBatches: [],
    currentBatch: 0,
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX -> OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX when there are remaining batches', () => {
    const state = createState({
      currentBatch: 0,
      bulkOperationBatches: [[{ create: {} }], [{ create: {} }]],
    });
    const res = Either.right(
      'bulk_index_succeeded'
    ) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX'>;

    const newState = outdatedDocumentsSearchBulkIndex(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX',
      currentBatch: 1,
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX -> OUTDATED_DOCUMENTS_SEARCH_READ when there are no remaining batches', () => {
    const state = createState({
      currentBatch: 1,
      bulkOperationBatches: [[{ create: {} }], [{ create: {} }]],
    });
    const res: StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX'> =
      Either.right('bulk_index_succeeded');

    const newState = outdatedDocumentsSearchBulkIndex(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
      corruptDocumentIds: [],
      transformErrors: [],
      hasTransformedDocs: true,
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX -> FATAL in case of request_entity_too_large_exception', () => {
    const state = createState({
      currentBatch: 1,
      bulkOperationBatches: [[{ create: {} }], [{ create: {} }]],
    });
    const res: StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX'> = Either.left({
      type: 'request_entity_too_large_exception',
    });

    const newState = outdatedDocumentsSearchBulkIndex(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: expect.any(String),
    });
  });
});
