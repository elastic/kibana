/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import { errors as EsErrors, TransportResult } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { waitForDeleteByQueryTask } from './wait_for_delete_by_query_task';
import { waitForTask } from './wait_for_task';

jest.mock('./wait_for_task');

const mockWaitForTask = waitForTask as jest.MockedFunction<typeof waitForTask>;

describe('waitForDeleteByQueryTask', () => {
  const client = elasticsearchClientMock.createInternalClient(
    Promise.resolve(elasticsearchClientMock.createApiResponse({}))
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls waitForTask() with the appropriate params', async () => {
    // Mock wait for delete finished successfully
    mockWaitForTask.mockReturnValueOnce(
      TaskEither.right({
        completed: true,
        error: Option.none,
        failures: Option.none,
        description: 'some description',
      })
    );

    const task = waitForDeleteByQueryTask({
      client,
      taskId: 'some task id',
      timeout: '60s',
    });

    await task();

    expect(waitForTask).toHaveBeenCalledWith({
      client,
      taskId: 'some task id',
      timeout: '60s',
    });
  });

  describe('when waitForTask() method rejects with a task completion timeout error', () => {
    it('catches the error and returns the appropriate Left response', async () => {
      // Mock task completion error
      const error = createError({
        body: { error: { type: 'timeout_exception', reason: 'es_reason' } },
      });

      mockWaitForTask.mockReturnValueOnce(
        TaskEither.left({
          type: 'wait_for_task_completion_timeout' as const,
          message: '[timeout_exception] es_reason',
          error,
        })
      );

      const task = waitForDeleteByQueryTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      const res = await task();

      expect(res).toEqual(
        Either.left({
          type: 'wait_for_task_completion_timeout' as const,
          message: '[timeout_exception] es_reason',
          error,
        })
      );
    });
  });

  describe('when waitForTask() method rejects with a retryable error', () => {
    it('catches the error and returns the appropriate Left response', async () => {
      // Mock retryable error
      const error = createError({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      });

      mockWaitForTask.mockReturnValueOnce(
        TaskEither.left({
          type: 'retryable_es_client_error' as const,
          message: 'es_type',
          error,
        })
      );

      const task = waitForDeleteByQueryTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      const res = await task();
      expect(res).toEqual(
        Either.left({
          type: 'retryable_es_client_error' as const,
          message: 'es_type',
          error,
        })
      );
    });
  });

  describe('when waitForTask() method finishes successfully, but there are failures', () => {
    it('returns a Left response, with the list of failures', async () => {
      // Mock successful with failures
      const failures = ['dashboard:12345 - Failed to delete', 'dashboard:67890 - Failed to delete'];

      mockWaitForTask.mockReturnValueOnce(
        TaskEither.right({
          completed: true,
          failures: Option.some(failures),
          error: Option.none,
        })
      );

      const task = waitForDeleteByQueryTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      const res = await task();
      expect(res).toEqual(
        Either.left({
          type: 'cleanup_failed' as const,
          failures,
        })
      );
    });
  });

  describe('when waitForTask() method throws an unexpected error', () => {
    it('rethrows the error', async () => {
      // Mock unexpected 500 Server Error
      const error = createError({
        statusCode: 500,
        body: { error: { type: 'server_error', reason: 'Something really bad happened' } },
      });

      mockWaitForTask.mockReturnValueOnce(async () => {
        throw error;
      });

      const task = waitForDeleteByQueryTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      expect(task()).rejects.toEqual(error);
    });
  });

  describe('when waitForTask() method finishes successfully without failures', () => {
    it('finsihes with a cleanup_successful Right clause', async () => {
      // Mock wait for delete finished successfully
      mockWaitForTask.mockReturnValueOnce(
        TaskEither.right({
          completed: true,
          error: Option.none,
          failures: Option.none,
          description: 'some description',
        })
      );
      const task = waitForDeleteByQueryTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      const res = await task();

      expect(res).toEqual(Either.right({ type: 'cleanup_successful' as const }));
    });
  });
});

const createError = (esResponse: Partial<TransportResult>) => {
  return new EsErrors.ResponseError(elasticsearchClientMock.createApiResponse(esResponse));
};
