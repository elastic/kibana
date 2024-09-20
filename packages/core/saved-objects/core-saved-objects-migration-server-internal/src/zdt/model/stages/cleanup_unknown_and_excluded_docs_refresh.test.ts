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
import type { CleanupUnknownAndExcludedDocsRefreshState } from '../../state';
import type { StateActionResponse } from '../types';
import { cleanupUnknownAndExcludedDocsRefresh } from './cleanup_unknown_and_excluded_docs_refresh';

describe('Stage: cleanupUnknownAndExcludedDocsRefresh', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<CleanupUnknownAndExcludedDocsRefreshState> = {}
  ): CleanupUnknownAndExcludedDocsRefreshState => ({
    ...createPostDocInitState(),
    controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT when successful', () => {
    const state = createState();
    const res = Either.right({
      refreshed: true,
    }) as StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH'>;

    const newState = cleanupUnknownAndExcludedDocsRefresh(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
    });
  });
});
