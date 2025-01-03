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
import type { CleanupUnknownAndExcludedDocsWaitForTaskState } from '../../state';
import type { StateActionResponse } from '../types';
import { cleanupUnknownAndExcludedDocsWaitForTask } from './cleanup_unknown_and_excluded_docs_wait_for_task';

describe('Stage: cleanupUnknownAndExcludedDocsWaitForTask', () => {
  let context: MockedMigratorContext;

  const createState = (
    parts: Partial<CleanupUnknownAndExcludedDocsWaitForTaskState> = {}
  ): CleanupUnknownAndExcludedDocsWaitForTaskState => ({
    ...createPostDocInitState(),
    controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
    deleteTaskId: '42',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK in case of wait_for_task_completion_timeout', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'> = Either.left(
      {
        type: 'wait_for_task_completion_timeout',
        message: 'woups',
      }
    );

    const newState = cleanupUnknownAndExcludedDocsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK',
      retryCount: 1,
      retryDelay: expect.any(Number),
      logs: expect.any(Array),
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS in case of cleanup_failed', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'> = Either.left(
      {
        type: 'cleanup_failed',
        failures: [],
        versionConflicts: 42,
      }
    );

    const newState = cleanupUnknownAndExcludedDocsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS',
      hasDeletedDocs: true,
      retryCount: 1,
      retryDelay: expect.any(Number),
      logs: expect.any(Array),
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> FATAL in case of cleanup_failed when exceeding retry count', () => {
    const state = createState({
      retryCount: context.maxRetryAttempts + 1,
    });
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'> = Either.left(
      {
        type: 'cleanup_failed',
        failures: [],
        versionConflicts: 42,
      }
    );

    const newState = cleanupUnknownAndExcludedDocsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: expect.any(String),
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH when successful and docs were deleted', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'> =
      Either.right({
        type: 'cleanup_successful',
        deleted: 9000,
      });

    const newState = cleanupUnknownAndExcludedDocsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH',
    });
  });

  it('CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK -> OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT when successful and no docs were deleted', () => {
    const state = createState();
    const res: StateActionResponse<'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK'> =
      Either.right({
        type: 'cleanup_successful',
        deleted: 0,
      });

    const newState = cleanupUnknownAndExcludedDocsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT',
    });
  });
});
