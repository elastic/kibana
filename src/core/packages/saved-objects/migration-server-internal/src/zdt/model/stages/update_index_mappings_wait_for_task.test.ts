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
  createPostInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { ResponseType } from '../../next';
import type {
  State,
  UpdateIndexMappingsState,
  UpdateIndexMappingsWaitForTaskState,
} from '../../state';
import type { StateActionResponse } from '../types';
import { updateIndexMappings } from './update_index_mappings';
import { updateIndexMappingsWaitForTask } from './update_index_mappings_wait_for_task';
import { model } from '../model';
import { RetryableEsClientError } from '../../actions';
import { TaskCompletedWithRetriableError } from '../../../actions/wait_for_task';
import { FatalState } from '../../../state';

describe('Stage: updateIndexMappings', () => {
  let context: MockedMigratorContext;

  const retryableError: RetryableEsClientError = {
    type: 'retryable_es_client_error',
    message: 'snapshot_in_progress_exception',
  };

  const taskCompletedWithRetriableError: TaskCompletedWithRetriableError = {
    type: 'task_completed_with_retriable_error' as const,
    message: 'search_phase_execution_exception',
  };

  const createState = (
    parts: Partial<UpdateIndexMappingsState> = {}
  ): UpdateIndexMappingsState => ({
    ...createPostInitState(),
    controlState: 'UPDATE_INDEX_MAPPINGS',
    additiveMappingChanges: {
      someToken: { type: 'keyword' },
      anotherField: { type: 'text', analyzer: 'standard' },
    },
    ...parts,
  });

  const createWaitState = (
    parts: Partial<UpdateIndexMappingsWaitForTaskState> = {}
  ): UpdateIndexMappingsWaitForTaskState => ({
    ...createPostInitState(),
    controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
    additiveMappingChanges: {
      someOtherToken: { type: 'keyword' },
      anotherAwesomeField: { type: 'text', analyzer: 'standard' },
    },
    updateTargetMappingsTaskId: '73',
    ...parts,
  });

  beforeEach(() => {
    context = createContextMock();
  });

  it('UPDATE_INDEX_MAPPINGS -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK when successful', () => {
    const state = createState();
    const res: ResponseType<'UPDATE_INDEX_MAPPINGS'> = Either.right({
      taskId: '42',
    });

    const newState = updateIndexMappings(
      state,
      res as StateActionResponse<'UPDATE_INDEX_MAPPINGS'>,
      context
    );

    // it's important that newState contains additiveMappingChanges in case we want to go back
    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
      updateTargetMappingsTaskId: '42',
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_INDEX_MAPPINGS in case of task_completed_with_retriable_error', () => {
    const state = createWaitState();
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left(
      taskCompletedWithRetriableError
    );

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS',
      retryCount: 1,
      skipRetryReset: true,
      retryDelay: expect.any(Number),
      logs: expect.any(Array),
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_INDEX_MAPPINGS after some retries', () => {
    const state = createWaitState({
      retryCount: 12,
    });
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left(
      taskCompletedWithRetriableError
    );

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS',
      retryCount: 13,
      skipRetryReset: true,
      retryDelay: expect.any(Number),
      logs: expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: `Action failed with 'search_phase_execution_exception'. Retrying attempt 13 in 64 seconds.`,
        }),
      ]),
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> FATAL in case of  task_completed_with_retriable_error when exceeding retry count', () => {
    const state = createWaitState({
      retryCount: context.maxRetryAttempts,
    });
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left(
      taskCompletedWithRetriableError
    );

    const newState = updateIndexMappingsWaitForTask(state, res, context) as unknown as FatalState;

    expect(newState.controlState).toEqual('FATAL');
    expect(newState.reason).toMatchInlineSnapshot(
      `"Unable to complete the UPDATE_INDEX_MAPPINGS step after 15 attempts, terminating. The last failure message was: search_phase_execution_exception"`
    );
  });

  describe('skipRetryReset', () => {
    test('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_TARGET_MAPPINGS_PROPERTIES -> UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK updates retry attributes correctly', () => {
      const initialRetryCount = 3;

      // First, we are in UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK state
      const initialWaitState: State = {
        ...createPostInitState(),
        controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK',
        additiveMappingChanges: {
          someOtherToken: { type: 'keyword' },
          anotherAwesomeField: { type: 'text', analyzer: 'standard' },
        },
        updateTargetMappingsTaskId: '73',
        retryCount: initialRetryCount,
      };
      expect(initialWaitState.retryCount).toBe(initialRetryCount);
      expect(initialWaitState.skipRetryReset).toBeFalsy();

      // Now we move to UPDATE_TARGET_MAPPINGS_PROPERTIES and retry it (+1 retry)
      const retryingMappingsUpdate = model(
        initialWaitState,
        Either.left(taskCompletedWithRetriableError),
        context
      );
      expect(retryingMappingsUpdate.retryCount).toBe(initialRetryCount + 1);
      expect(retryingMappingsUpdate.skipRetryReset).toBe(true);

      // We retry UPDATE_TARGET_MAPPINGS_PROPERTIES again (+1 retry)
      const retryingMappingsUpdateAgain = model(
        retryingMappingsUpdate,
        Either.left(retryableError),
        context
      );
      expect(retryingMappingsUpdateAgain.retryCount).toBe(initialRetryCount + 2);
      expect(retryingMappingsUpdateAgain.skipRetryReset).toBe(true);

      // Now we go back to the wait state, so retryCount should remain the same
      const finalWaitStateBeforeCompletion = model(
        retryingMappingsUpdateAgain,
        Either.right({
          taskId: 'update target mappings task',
        }) as StateActionResponse<'UPDATE_INDEX_MAPPINGS'>,
        context
      );
      expect(finalWaitStateBeforeCompletion.retryCount).toBe(initialRetryCount + 2);
      expect(finalWaitStateBeforeCompletion.skipRetryReset).toBeFalsy();

      // The wait state completes successfully, so retryCount should reset
      const postUpdateState = model(
        finalWaitStateBeforeCompletion,
        Either.right(
          'pickup_updated_mappings_succeeded'
        ) as StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'>,
        context
      );
      expect(postUpdateState.retryCount).toBe(0);
      expect(postUpdateState.skipRetryReset).toBeFalsy();
    });
  });
});
