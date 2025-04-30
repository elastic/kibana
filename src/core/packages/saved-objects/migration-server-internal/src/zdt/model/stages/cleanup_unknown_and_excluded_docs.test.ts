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
  createPostDocInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { CleanupUnknownAndExcludedDocsState } from '../../state';
import type { StateActionResponse } from '../types';
import { cleanupUnknownAndExcludedDocs } from './cleanup_unknown_and_excluded_docs';

describe('Stage: cleanupUnknownAndExcludedDocs', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<CleanupUnknownAndExcludedDocsState> = {}
  ): CleanupUnknownAndExcludedDocsState => ({
    ...createPostDocInitState(),
    controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK when successful with cleanup_started', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'> = Either.right({
      type: 'cleanup_started',
      taskId: '42',
      errorsByType: {},
      unknownDocs: [],
    });

    const newState = cleanupUnknownAndExcludedDocs(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
      deleteTaskId: '42',
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH when successful with cleanup_not_needed and hasDeletedDocs is true', () => {
    const state = createState({ hasDeletedDocs: true });
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'> = Either.right({
      type: 'cleanup_not_needed',
    });

    const newState = cleanupUnknownAndExcludedDocs(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH',
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT when successful with cleanup_not_needed and hasDeletedDocs is false', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'> = Either.right({
      type: 'cleanup_not_needed',
    });

    const newState = cleanupUnknownAndExcludedDocs(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS -> FATAL when unsuccessful', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS'> = Either.left({
      type: 'unknown_docs_found',
      unknownDocs: [],
    });

    const newState = cleanupUnknownAndExcludedDocs(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: expect.any(String),
    });
  });
});
