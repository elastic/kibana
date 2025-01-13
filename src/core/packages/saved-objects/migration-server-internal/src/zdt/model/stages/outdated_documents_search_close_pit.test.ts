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
import type { OutdatedDocumentsSearchClosePitState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchClosePit } from './outdated_documents_search_close_pit';

describe('Stage: outdatedDocumentsSearchClosePit', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchClosePitState> = {}
  ): OutdatedDocumentsSearchClosePitState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> OUTDATED_DOCUMENTS_SEARCH_REFRESH when documents were transformed', () => {
    const state = createState({
      hasTransformedDocs: true,
    });
    const res = Either.right({}) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'>;

    const newState = outdatedDocumentsSearchClosePit(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_REFRESH',
    });
  });

  it('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT -> UPDATE_DOCUMENT_MODEL_VERSIONS when no documents were transformed', () => {
    const state = createState({
      hasTransformedDocs: false,
    });
    const res = Either.right({}) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT'>;

    const newState = outdatedDocumentsSearchClosePit(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
    });
  });
});
