/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { retryUntilAvailable, RolloutGatesStoppedError } from './retry_until_available';

describe('retryUntilAvailable', () => {
  it('returns the result on the first successful attempt', async () => {
    const logger = loggerMock.create();
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await retryUntilAvailable(fn, { logger, label: 'test', sleep: jest.fn() });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries with exponential backoff until fn succeeds', async () => {
    const logger = loggerMock.create();
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('es unavailable'))
      .mockRejectedValueOnce(new Error('es still unavailable'))
      .mockResolvedValueOnce('ok');

    const result = await retryUntilAvailable(fn, {
      logger,
      label: 'test',
      initialDelayMs: 10,
      maxDelayMs: 1000,
      sleep,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10);
    expect(sleep).toHaveBeenNthCalledWith(2, 20);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('caps the backoff delay at maxDelayMs', async () => {
    const logger = loggerMock.create();
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'))
      .mockResolvedValueOnce('ok');

    await retryUntilAvailable(fn, {
      logger,
      label: 'test',
      initialDelayMs: 100,
      maxDelayMs: 150,
      sleep,
    });

    expect(sleep).toHaveBeenNthCalledWith(1, 100);
    expect(sleep).toHaveBeenNthCalledWith(2, 150);
    expect(sleep).toHaveBeenNthCalledWith(3, 150);
  });

  it('throws RolloutGatesStoppedError instead of retrying once stopped', async () => {
    const logger = loggerMock.create();
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fn = jest.fn().mockRejectedValue(new Error('es unavailable'));
    let stopped = false;

    const promise = retryUntilAvailable(fn, {
      logger,
      label: 'test',
      initialDelayMs: 10,
      sleep: async (ms) => {
        stopped = true;
        return sleep(ms);
      },
      isStopped: () => stopped,
    });

    await expect(promise).rejects.toBeInstanceOf(RolloutGatesStoppedError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never calls fn when already stopped before the first attempt', async () => {
    const logger = loggerMock.create();
    const fn = jest.fn();

    await expect(
      retryUntilAvailable(fn, { logger, label: 'test', isStopped: () => true })
    ).rejects.toBeInstanceOf(RolloutGatesStoppedError);
    expect(fn).not.toHaveBeenCalled();
  });
});
