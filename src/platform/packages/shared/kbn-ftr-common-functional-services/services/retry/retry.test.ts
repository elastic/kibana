/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import type { FtrProviderContext } from '../ftr_provider_context';
import { RetryService } from './retry';

const createRetryService = (log = new ToolingLog()) => {
  const context: Pick<FtrProviderContext, 'getService'> = {
    getService: jest
      .fn()
      .mockImplementation((name: string) => (name === 'log' ? log : { get: () => 20_000 })),
  };
  return new RetryService(context as FtrProviderContext);
};

describe('tryWithRetries', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it(`logs failures and recovery callbacks`, async () => {
    const successfulAttempt = 3;
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);

    let count = 0;
    const block = async () => {
      count++;
      if (count !== successfulAttempt) throw Error('whoops, could not find anything');
    };

    const retry = createRetryService(log);
    const result = retry.tryWithRetries('test action', block, { timeout: 4500 }, async () =>
      log.debug('handled failure')
    );
    await jest.advanceTimersByTimeAsync(400);
    await result;

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " [2mdebg[22m --- retry.tryWithRetries error: whoops, could not find anything",
        " [2mdebg[22m handled failure",
        " [2mdebg[22m --- retry.tryWithRetries failed again with the same message...",
        " [2mdebg[22m handled failure",
      ]
    `);
  });

  it('stops at the timeout and retains the 200 ms default delay', async () => {
    const block = jest.fn().mockRejectedValue(new Error('not ready'));
    const onFailureBlock = jest.fn().mockResolvedValue(undefined);
    const result = expect(
      createRetryService().tryWithRetries('test action', block, { timeout: 450 }, onFailureBlock)
    ).rejects.toThrow("reached timeout 450 ms waiting for 'test action'");

    await jest.advanceTimersByTimeAsync(199);
    expect(block).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(block).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(400);
    await result;
    expect(block).toHaveBeenCalledTimes(3);
    expect(onFailureBlock).toHaveBeenCalledTimes(2);
  });

  it('honors the timeout with an explicit retry delay', async () => {
    const block = jest.fn().mockRejectedValue(new Error('not ready'));
    const result = expect(
      createRetryService().tryWithRetries('test action', block, {
        retryDelay: 100,
        timeout: 250,
      })
    ).rejects.toThrow('reached timeout 250 ms');

    await jest.advanceTimersByTimeAsync(300);
    await result;
    expect(block).toHaveBeenCalledTimes(3);
  });

  it('keeps polling until success without an attempt limit', async () => {
    let attempts = 0;
    const block = jest.fn(async () => {
      if (++attempts <= 10) throw new Error('not ready');
      return 42;
    });
    const result = createRetryService().tryWithRetries('test action', block);

    await jest.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe(42);
    expect(block).toHaveBeenCalledTimes(11);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('waits for the initial delay and returns a successful attempt without another delay', async () => {
    const block = jest.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(42);
    const result = createRetryService().tryWithRetries('test action', block, {
      retryDelay: 50,
      initialDelay: 1000,
    });

    await jest.advanceTimersByTimeAsync(999);
    expect(block).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(block).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(50);
    await expect(result).resolves.toBe(42);
    expect(block).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });
});
