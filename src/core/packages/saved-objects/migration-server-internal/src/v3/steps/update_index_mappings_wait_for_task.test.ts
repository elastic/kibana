/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStep } from '../types';
import { createTestContext } from '../test_helpers/context';
import { createIOStub } from '../test_helpers/io';
import { existingIndexState } from '../test_helpers/state';
import * as WAIT_FOR_TASK from './update_index_mappings_wait_for_task';

describe('UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK', () => {
  const context = createTestContext({ migrationConfig: { retryAttempts: 2 } });
  const state: WAIT_FOR_TASK.State = {
    ...existingIndexState(context),
    controlState: WAIT_FOR_TASK.Name,
    updateTargetMappingsTaskId: 'pickup-task',
  };

  it('keeps polling a running task, without using the retry budget', async () => {
    const io = createIOStub(context);
    io.waitForPickupMappingsTask.mockResolvedValue({
      type: 'wait_for_task_completion_timeout',
      message: 'still running',
    });

    const next = await runStep(WAIT_FOR_TASK.step({ ...state, pollCount: 10 }, io, context));
    expect(next).toMatchObject({ controlState: WAIT_FOR_TASK.Name, retryCount: 0, pollCount: 11 });
  });

  it('retries a failure after a long wait, within the retry budget', async () => {
    const io = createIOStub(context);
    io.waitForPickupMappingsTask.mockResolvedValue({
      type: 'retryable_es_client_error',
      message: 'timeout',
    });

    const next = await runStep(WAIT_FOR_TASK.step({ ...state, pollCount: 50 }, io, context));
    expect(next).toMatchObject({ controlState: WAIT_FOR_TASK.Name, retryCount: 1 });
  });

  it('updates the mappings again when the task is lost, keeping the retry count', async () => {
    const io = createIOStub(context);
    io.waitForPickupMappingsTask.mockResolvedValue({ type: 'task_not_found', message: 'lost' });

    const next = await runStep(WAIT_FOR_TASK.step(state, io, context));
    expect(next).toMatchObject({
      controlState: 'UPDATE_INDEX_MAPPINGS',
      retryCount: 1,
      skipRetryReset: true,
    });
    expect(next).not.toHaveProperty('updateTargetMappingsTaskId');
  });

  it('fails when the task keeps getting lost', async () => {
    const io = createIOStub(context);
    io.waitForPickupMappingsTask.mockResolvedValue({ type: 'task_not_found', message: 'lost' });

    const next = await runStep(WAIT_FOR_TASK.step({ ...state, retryCount: 2 }, io, context));
    expect(next).toMatchObject({
      controlState: 'FATAL',
      reason: expect.stringContaining('after 2 attempts'),
    });
  });
});
