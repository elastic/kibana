/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { errors as EsErrors, type DiagnosticResult } from '@elastic/elasticsearch';
import { retryTransientEsErrors } from './retry_transient_es_errors';

const mockLogger = loggingSystemMock.createLogger();

// mock setTimeout to avoid waiting in tests and prevent test flakiness
global.setTimeout = jest.fn((cb) => jest.fn(cb())) as unknown as typeof global.setTimeout;

describe('retryTransientEsErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { error: new EsErrors.ConnectionError('test error'), errorType: 'ConnectionError' },
    {
      error: new EsErrors.NoLivingConnectionsError('test error', {} as DiagnosticResult),
      errorType: 'NoLivingConnectionsError',
    },
    { error: new EsErrors.TimeoutError('test error'), errorType: 'TimeoutError' },
    {
      error: new EsErrors.ResponseError({ statusCode: 503 } as DiagnosticResult),
      errorType: 'ResponseError (Unavailable)',
    },
    {
      error: new EsErrors.ResponseError({ statusCode: 408 } as DiagnosticResult),
      errorType: 'ResponseError (RequestTimeout)',
    },
    {
      error: new EsErrors.ResponseError({ statusCode: 410 } as DiagnosticResult),
      errorType: 'ResponseError (Gone)',
    },
  ])('should retry $errorType', async ({ error }) => {
    const mockFn = jest.fn();
    mockFn.mockRejectedValueOnce(error);
    mockFn.mockResolvedValueOnce('success');

    const result = await retryTransientEsErrors(mockFn, { logger: mockLogger });

    expect(result).toEqual('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should throw non-transient errors', async () => {
    const error = new EsErrors.ResponseError({ statusCode: 429 } as DiagnosticResult);
    const mockFn = jest.fn();
    mockFn.mockRejectedValueOnce(error);

    await expect(retryTransientEsErrors(mockFn, { logger: mockLogger })).rejects.toEqual(error);

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should throw if max retries exceeded', async () => {
    const error = new EsErrors.ConnectionError('test error');
    const mockFn = jest.fn();
    mockFn.mockRejectedValueOnce(error);
    mockFn.mockRejectedValueOnce(error);

    await expect(
      retryTransientEsErrors(mockFn, { logger: mockLogger, attempt: 2 })
    ).rejects.toEqual(error);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });
});
