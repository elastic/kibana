/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { retryEs } from './retry_es';

describe('retryEs', () => {
  const createCircuitBreaking429 = () =>
    new EsErrors.ResponseError({
      statusCode: 429,
      body: {
        error: {
          type: 'circuit_breaking_exception',
          reason: '[parent] Data too large',
          root_cause: [{ type: 'circuit_breaking_exception', reason: '[parent] Data too large' }],
        },
      },
      warnings: [],
      headers: {},
      meta: {
        meta: {
          request: {
            params: {
              method: 'PUT',
              path: '/_index_template/my-data-stream',
            },
          },
        },
      } as any,
    });

  const createTooManyRequestsError = () =>
    new EsErrors.ResponseError({
      statusCode: 429,
      body: {
        error: {
          type: 'too_many_requests_exception',
          reason: 'too many requests',
        },
      },
      warnings: [],
      headers: {},
      meta: {} as any,
    });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries 429 circuit breaker errors indefinitely with capped exponential backoff', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createCircuitBreaking429();
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);
    await jest.advanceTimersByTimeAsync(8_000);
    await jest.advanceTimersByTimeAsync(16_000);

    await expect(promise).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(6);
    expect(logger.warn).toHaveBeenCalledTimes(5);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'PUT /_index_template/my-data-stream call failed with retryable error circuit_breaking_exception'
      )
    );
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining('attempt 5 in 16 seconds')
    );
  });

  it('caps indefinite 429 retry delays at 64 seconds', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createCircuitBreaking429();
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);
    await jest.advanceTimersByTimeAsync(8_000);
    await jest.advanceTimersByTimeAsync(16_000);
    await jest.advanceTimersByTimeAsync(32_000);
    await jest.advanceTimersByTimeAsync(64_000);

    await expect(promise).resolves.toBe('done');
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining('attempt 7 in 64 seconds')
    );
  });

  it('retries 429 too many requests errors indefinitely', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createTooManyRequestsError();
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);
    await jest.advanceTimersByTimeAsync(8_000);

    await expect(promise).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(5);
    expect(logger.warn).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Elasticsearch call failed with retryable error too_many_requests_exception'
      )
    );
  });
});
