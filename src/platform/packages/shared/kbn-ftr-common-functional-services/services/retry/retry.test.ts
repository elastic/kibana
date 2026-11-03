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

describe('RetryService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('logs failures and runs recovery callbacks passed through options', async () => {
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);
    let attempts = 0;
    const block = async () => {
      if (++attempts < 3) throw Error('whoops, could not find anything');
    };

    const result = createRetryService(log).tryForTime(4500, block, {
      description: 'test action',
      onFailureBlock: async () => log.debug('handled failure'),
    });
    await jest.advanceTimersByTimeAsync(200);
    await result;

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " [2mdebg[22m --- retry.tryForTime error: whoops, could not find anything",
        " [2mdebg[22m handled failure",
        " [2mdebg[22m --- retry.tryForTime failed again with the same message...",
        " [2mdebg[22m handled failure",
      ]
    `);
  });

  it('honors a timeout override with the 100 ms default delay', async () => {
    const block = jest.fn().mockRejectedValue(new Error('not ready'));
    const onFailureBlock = jest.fn().mockResolvedValue(undefined);
    const result = expect(
      createRetryService().try(block, { timeout: 250, description: 'test action', onFailureBlock })
    ).rejects.toThrow("reached timeout 250 ms waiting for 'test action'");

    await jest.advanceTimersByTimeAsync(99);
    expect(block).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(block).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(200);
    await result;
    expect(block).toHaveBeenCalledTimes(3);
    expect(onFailureBlock).toHaveBeenCalledTimes(2);
  });

  it('honors an explicit timeout and retry delay', async () => {
    const block = jest.fn().mockRejectedValue(new Error('not ready'));
    const result = expect(
      createRetryService().tryForTime(600, block, { retryDelay: 250 })
    ).rejects.toThrow('reached timeout 600 ms');

    await jest.advanceTimersByTimeAsync(750);
    await result;
    expect(block).toHaveBeenCalledTimes(3);
  });

  it('keeps polling until success without an attempt limit', async () => {
    let attempts = 0;
    const block = jest.fn(async () => {
      if (++attempts <= 10) throw new Error('not ready');
      return 42;
    });
    const result = createRetryService().try(block);

    await jest.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe(42);
    expect(block).toHaveBeenCalledTimes(11);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses the configured timeout when no override is supplied', async () => {
    const result = expect(
      createRetryService().try(async () => {
        throw new Error('not ready');
      })
    ).rejects.toThrow('reached timeout 20000 ms');

    await jest.advanceTimersByTimeAsync(20100);
    await result;
  });

  it('applies the initial delay before starting the timeout', async () => {
    const block = jest.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(42);
    const result = createRetryService().tryForTime(60, block, {
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

  it.each(['try', 'tryForTime'])(
    'preserves the callback and delay arguments for %s',
    async (method) => {
      const block = jest.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(42);
      const onFailureBlock = jest.fn().mockResolvedValue(undefined);
      const retry = createRetryService();
      const result =
        method === 'try'
          ? retry.try(block, onFailureBlock, 250)
          : retry.tryForTime(1000, block, onFailureBlock, 250);

      await jest.advanceTimersByTimeAsync(249);
      expect(block).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(1);
      await expect(result).resolves.toBe(42);
      expect(onFailureBlock).toHaveBeenCalledTimes(1);
      expect(block).toHaveBeenCalledTimes(2);
    }
  );
});
