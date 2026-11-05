/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { retryForSuccess } from './retry_for_success';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import * as testJestHelpers from '@kbn/test-jest-helpers';

describe('Retry for success', () => {
  it(`should log failures and run the recovery callback`, async () => {
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);

    let count = 0;
    const block = async () => {
      count++;
      if (count !== 3) throw Error('whoops, could not find anything');
    };

    await retryForSuccess(log, {
      block,
      timeout: 4500,
      methodName: 'retryForSuccess unit test',
      onFailureBlock: async () => log.debug('handled failure'),
    });

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " [2mdebg[22m --- retryForSuccess unit test error: whoops, could not find anything",
        " [2mdebg[22m handled failure",
        " [2mdebg[22m --- retryForSuccess unit test failed again with the same message...",
        " [2mdebg[22m handled failure",
      ]
    `);
  });
  it('should call delay with initialDelay if initialDelay is provided', async () => {
    const delaySpy = jest.spyOn(testJestHelpers, 'delay').mockResolvedValue(undefined);
    const log = new ToolingLog();
    const block = async () => 42;
    const initialDelay = 1234;

    await retryForSuccess(log, {
      block,
      timeout: 2000,
      methodName: 'retryForSuccess initialDelay test',
      initialDelay,
    });

    expect(delaySpy).toHaveBeenCalledWith(initialDelay);
    delaySpy.mockRestore();
  });

  describe('timeout-based polling', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(0);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each([undefined, 250])('waits for readiness with retryDelay=%s', async (retryDelay) => {
      const block = jest.fn(async () => {
        if (Date.now() < 2000) throw new Error('not ready');
        return 42;
      });
      const result = retryForSuccess(new ToolingLog(), {
        methodName: 'poll',
        timeout: 3000,
        retryDelay,
        block,
      });

      await jest.advanceTimersByTimeAsync(2000);
      await expect(result).resolves.toBe(42);
      expect(block).toHaveBeenCalledTimes(2000 / (retryDelay ?? 100) + 1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('stops at the timeout when readiness never arrives', async () => {
      const block = jest.fn().mockRejectedValue(new Error('not ready'));
      const result = expect(
        retryForSuccess(new ToolingLog(), {
          methodName: 'poll',
          timeout: 250,
          block,
        })
      ).rejects.toThrow('poll reached timeout 250 ms');

      await jest.advanceTimersByTimeAsync(300);
      await result;
      expect(block).toHaveBeenCalledTimes(3);
    });

    it('ignores a legacy attempt limit on an options object', async () => {
      const block = jest.fn().mockRejectedValueOnce(new Error('not ready')).mockResolvedValue(42);
      const options = { methodName: 'poll', timeout: 1000, retryCount: 1, block };
      const result = retryForSuccess(new ToolingLog(), options);

      await jest.advanceTimersByTimeAsync(100);
      await expect(result).resolves.toBe(42);
      expect(block).toHaveBeenCalledTimes(2);
    });
  });
});
