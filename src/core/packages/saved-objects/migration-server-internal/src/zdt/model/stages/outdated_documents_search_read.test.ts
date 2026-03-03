/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import {
  createContextMock,
  createOutdatedDocumentSearchState,
  createSavedObjectRawDoc,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { OutdatedDocumentsSearchReadState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchRead } from './outdated_documents_search_read';

describe('Stage: outdatedDocumentsSearchRead', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchReadState> = {}
  ): OutdatedDocumentsSearchReadState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_TRANSFORM when outdated documents are found', () => {
    const state = createState({
      progress: {
        total: 300,
        processed: 0,
      },
    });
    const outdatedDocuments = [
      createSavedObjectRawDoc({ _id: '1' }),
      createSavedObjectRawDoc({ _id: '2' }),
    ];
    const res = Either.right({
      outdatedDocuments,
      pitId: 'refreshed_pit_id',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      pitId: 'refreshed_pit_id',
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM',
      outdatedDocuments,
      lastHitSortValue: [12, 24],
      logs: expect.any(Array),
      progress: {
        total: 9000,
        processed: 0,
      },
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT when no more outdated documents', () => {
    const state = createState({
      progress: {
        total: 300,
        processed: 0,
      },
    });
    const res = Either.right({
      outdatedDocuments: [],
      pitId: 'refreshed_pit_id',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      pitId: 'refreshed_pit_id',
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
      logs: expect.any(Array),
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL when corrupt ids are found and discardCorruptObjects is false', () => {
    context = createContextMock({
      discardCorruptObjects: false,
    });
    const state = createState({
      corruptDocumentIds: ['foo_1', 'bar_2'],
    });
    const res = Either.right({
      outdatedDocuments: [],
      pitId: '42',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: expect.any(String),
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> FATAL when transform errors are found and discardCorruptObjects is false', () => {
    context = createContextMock({
      discardCorruptObjects: false,
    });
    const state = createState({
      transformErrors: [{ rawId: 'foo_1', err: new Error('woups') }],
    });
    const res = Either.right({
      outdatedDocuments: [],
      pitId: '42',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: expect.any(String),
    });
  });

  ////

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT when corrupt ids are are found and discardCorruptObjects is false', () => {
    context = createContextMock({
      discardCorruptObjects: true,
    });
    const state = createState({
      corruptDocumentIds: ['foo_1', 'bar_2'],
    });
    const res = Either.right({
      outdatedDocuments: [],
      pitId: '42',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
      logs: expect.any(Array),
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_READ -> OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT when transform errors are found and discardCorruptObjects is false', () => {
    context = createContextMock({
      discardCorruptObjects: true,
    });
    const state = createState({
      transformErrors: [{ rawId: 'foo_1', err: new Error('woups') }],
    });
    const res = Either.right({
      outdatedDocuments: [],
      pitId: '42',
      lastHitSortValue: [12, 24],
      totalHits: 9000,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_READ'>;

    const newState = outdatedDocumentsSearchRead(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
      logs: expect.any(Array),
    });
  });
});
