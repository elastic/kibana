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
  createPostInitState,
  type MockedMigratorContext,
} from '../../test_helpers';
import type { ResponseType } from '../../next';
import type { UpdateIndexMappingsState, UpdateIndexMappingsWaitForTaskState } from '../../state';
import type { StateActionResponse } from '../types';
import { updateIndexMappings } from './update_index_mappings';
import { updateIndexMappingsWaitForTask } from './update_index_mappings_wait_for_task';

describe('Stage: updateIndexMappings', () => {
  let context: MockedMigratorContext;

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

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_INDEX_MAPPINGS in case of wait_for_task_completed_with_error_retry_original', () => {
    const state = createWaitState();
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
      type: 'wait_for_task_completed_with_error_retry_original' as const,
      message: 'search_phase_execution_exception',
    });

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS',
      retryCount: 1,
      retryDelay: expect.any(Number),
      logs: expect.any(Array),
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> UPDATE_INDEX_MAPPINGS after some retries', () => {
    const state = createWaitState({
      retryCount: 12,
    });
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
      type: 'wait_for_task_completed_with_error_retry_original' as const,
      message: 'temporary_error',
    });

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'UPDATE_INDEX_MAPPINGS',
      retryCount: 13,
      retryDelay: expect.any(Number),
      logs: expect.arrayContaining([
        expect.objectContaining({
          level: 'warning',
          message: `Errors occurred while trying to update index mappings. Retrying attempt 13.`,
        }),
      ]),
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> FATAL after 15 retries', () => {
    const state = createWaitState({
      retryCount: 15,
    });
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
      type: 'wait_for_task_completed_with_error_retry_original' as const,
      message: 'persistent_error',
    });

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: `Migration was retried ${state.retryCount} times but failed with: persistent_error.`,
    });
  });

  it('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK -> FATAL in case of  wait_for_task_completed_with_error_retry_original when exceeding retry count', () => {
    const state = createWaitState({
      retryCount: context.maxRetryAttempts + 1,
    });
    const res: StateActionResponse<'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK'> = Either.left({
      type: 'wait_for_task_completed_with_error_retry_original' as const,
      message: 'search_phase_execution_exception',
    });

    const newState = updateIndexMappingsWaitForTask(state, res, context);

    expect(newState).toEqual({
      ...state,
      controlState: 'FATAL',
      reason: `Migration was retried ${state.retryCount} times but failed with: search_phase_execution_exception.`,
    });
  });
});
