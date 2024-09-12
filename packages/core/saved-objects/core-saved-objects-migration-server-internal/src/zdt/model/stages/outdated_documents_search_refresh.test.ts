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
import type { OutdatedDocumentsSearchRefreshState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchRefresh } from './outdated_documents_search_refresh';

describe('Stage: outdatedDocumentsSearchRefresh', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchRefreshState> = {}
  ): OutdatedDocumentsSearchRefreshState => ({
    ...createOutdatedDocumentSearchState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_REFRESH',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_REFRESH -> UPDATE_DOCUMENT_MODEL_VERSIONS when successful', () => {
    const state = createState({});
    const res = Either.right({
      refreshed: true,
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_REFRESH'>;

    const newState = outdatedDocumentsSearchRefresh(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_DOCUMENT_MODEL_VERSIONS',
    });
  });
});
