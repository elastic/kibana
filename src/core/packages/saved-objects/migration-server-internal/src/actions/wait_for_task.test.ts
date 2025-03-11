/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/lib/Either';
import { errors as EsErrors, TransportResult } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { waitForTask } from './wait_for_task';

describe('waitForTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls tasks API get() with the correct parameters', async () => {
    // Mock client that rejects with a retryable error
    const { client } = createErrorClient({
      statusCode: 503,
      body: { error: { type: 'es_type', reason: 'es_reason' } },
    });

    const task = waitForTask({
      client,
      taskId: 'my task id',
      timeout: '60s',
    });

    await task();
    expect(client.tasks.get).toHaveBeenCalledTimes(1);
    expect(client.tasks.get).toHaveBeenCalledWith({
      task_id: 'my task id',
      wait_for_completion: true,
      timeout: '60s',
    });
  });

  describe('when tasks API get() method rejects with a task completion timeout error', () => {
    it('catches the error and returns the appropriate Left response', async () => {
      // Mock client that rejects with a task completion timeout error
      const { client, error } = createErrorClient({
        body: { error: { type: 'timeout_exception', reason: 'es_reason' } },
      });

      const task = waitForTask({
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

  describe('when tasks API get() method rejects with a retryable error', () => {
    it('catches the error and returns the appropriate Left response', async () => {
      // Mock client that rejects with a 503 status code
      const { client, error } = createErrorClient({
        statusCode: 503,
        body: { error: { type: 'es_type', reason: 'es_reason' } },
      });

      const task = waitForTask({
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

  describe('when tasks API get() method rejects with an unexpected error', () => {
    it('rethrows the error', async () => {
      // Mock client that rejects with a 500 Server Error
      const { client, error } = createErrorClient({
        statusCode: 500,
        body: { error: { type: 'server_error', reason: 'Something really bad happened' } },
      });

      const task = waitForTask({
        client,
        taskId: 'my task id',
        timeout: '60s',
      });

      expect(task()).rejects.toEqual(error);
    });
  });
});

const createErrorClient = (esResponse: Partial<TransportResult>) => {
  const error = new EsErrors.ResponseError(elasticsearchClientMock.createApiResponse(esResponse));
  const client = elasticsearchClientMock.createInternalClient(
    elasticsearchClientMock.createErrorTransportRequestPromise(error)
  );

  return { client, error };
};
