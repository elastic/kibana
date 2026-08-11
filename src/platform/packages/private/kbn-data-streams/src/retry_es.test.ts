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
  const createResponseError = ({
    statusCode,
    type,
    reason = type,
    withRequestMeta = false,
  }: {
    statusCode: number;
    type: string;
    reason?: string;
    withRequestMeta?: boolean;
  }) =>
    new EsErrors.ResponseError({
      statusCode,
      body: {
        error: {
          type,
          reason,
          root_cause: [{ type, reason }],
        },
      },
      warnings: [],
      headers: {},
      meta: withRequestMeta
        ? ({
            meta: {
              request: {
                params: {
                  method: 'PUT',
                  path: '/_index_template/my-data-stream',
                },
              },
            },
          } as any)
        : ({} as any),
    });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    {
      name: 'circuit breaker',
      error: createResponseError({
        statusCode: 429,
        type: 'circuit_breaking_exception',
        reason: '[parent] Data too large',
        withRequestMeta: true,
      }),
      expectedLogMessage:
        'PUT /_index_template/my-data-stream call failed with retryable error circuit_breaking_exception',
    },
    {
      name: 'too many requests',
      error: createResponseError({
        statusCode: 429,
        type: 'too_many_requests_exception',
        reason: 'too many requests',
      }),
      expectedLogMessage:
        'Elasticsearch call failed with retryable error too_many_requests_exception',
    },
  ])('retries 429 $name errors indefinitely with capped exponential backoff', async (testCase) => {
    const logger = loggingSystemMock.createLogger();
    const operation = jest
      .fn()
      .mockRejectedValueOnce(testCase.error)
      .mockRejectedValueOnce(testCase.error)
      .mockRejectedValueOnce(testCase.error)
      .mockRejectedValueOnce(testCase.error)
      .mockResolvedValue('done');

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);
    await jest.advanceTimersByTimeAsync(8_000);

    await expect(promise).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(5);
    expect(logger.warn).toHaveBeenCalledTimes(4);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(testCase.expectedLogMessage));
    expect(logger.warn).toHaveBeenLastCalledWith(expect.stringContaining('attempt 4 in 8 seconds'));
  });

  it('caps indefinite 429 retry delays at 64 seconds', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createResponseError({
      statusCode: 429,
      type: 'circuit_breaking_exception',
      reason: '[parent] Data too large',
      withRequestMeta: true,
    });
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
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
    await jest.advanceTimersByTimeAsync(64_000);

    await expect(promise).resolves.toBe('done');
    expect(logger.warn).toHaveBeenCalledTimes(8);
    expect(logger.warn).toHaveBeenLastCalledWith(
      expect.stringContaining('attempt 8 in 64 seconds')
    );
  });

  it('retries non-429 retryable errors up to the bounded retry count', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createResponseError({
      statusCode: 503,
      type: 'service_unavailable',
    });
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('done');

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);

    await expect(promise).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(4);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rejects non-429 retryable errors after the bounded retry count', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = createResponseError({
      statusCode: 503,
      type: 'service_unavailable',
    });
    const operation = jest.fn().mockRejectedValue(error);

    const promise = retryEs(operation, { logger, dataStreamName: 'my-data-stream' });
    const assertion = expect(promise).rejects.toBe(error);

    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await jest.advanceTimersByTimeAsync(4_000);

    await assertion;
    expect(operation).toHaveBeenCalledTimes(4);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
