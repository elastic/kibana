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
  createPostDocInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { OutdatedDocumentsSearchOpenPitState } from '../../state';
import type { StateActionResponse } from '../types';
import { outdatedDocumentsSearchOpenPit } from './outdated_documents_search_open_pit';

describe('Stage: outdatedDocumentsSearchOpenPit', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<OutdatedDocumentsSearchOpenPitState> = {}
  ): OutdatedDocumentsSearchOpenPitState => ({
    ...createPostDocInitState(),
    controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT -> OUTDATED_DOCUMENTS_SEARCH_READ when successful', () => {
    const state = createState();
    const res = Either.right({
      pitId: '42',
    }) as StateActionResponse<'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT'>;

    const newState = outdatedDocumentsSearchOpenPit(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_READ',
      pitId: '42',
      lastHitSortValue: undefined,
      corruptDocumentIds: [],
      transformErrors: [],
      progress: {
        processed: undefined,
        total: undefined,
      },
      hasTransformedDocs: false,
    });
  });
});
