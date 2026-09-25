/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_RETRY_COUNT_DELAY,
  DEFAULT_RETRY_DELAY,
  retryForSuccess,
} from './retry_for_success';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import * as testJestHelpers from '@kbn/test-jest-helpers';

describe('Retry for success', () => {
  it(`should print out attempt counts with the retryCount parameter`, async () => {
    const retryCount = 3;
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);

    let count = 0;
    const block = async () => {
      count++;
      if (count !== retryCount) throw Error('whoops, could not find anything');
    };

    await retryForSuccess(log, {
      block,
      timeout: 4500,
      methodName: 'retryForSuccess unit test',
      retryCount,
      onFailureBlock: async () => log.debug('handled failure'),
    });

    expect(writer.messages).toEqual([
      expect.stringContaining(
        '--- retryForSuccess unit test error: whoops, could not find anything - Attempt #: 1'
      ),
      expect.stringContaining('handled failure'),
      expect.stringContaining(
        '--- retryForSuccess unit test failed again with the same message... - Attempt #: 2'
      ),
      expect.stringContaining('handled failure'),
    ]);
  });
  it(`should NOT print out attempt counts without the retryCount parameter`, async () => {
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

    expect(writer.messages).toEqual([
      expect.stringContaining(
        '--- retryForSuccess unit test error: whoops, could not find anything'
      ),
      expect.stringContaining('handled failure'),
      expect.stringContaining(
        '--- retryForSuccess unit test failed again with the same message...'
      ),
      expect.stringContaining('handled failure'),
    ]);
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

  it('uses the default retry delay when retryDelay is not provided', async () => {
    const delaySpy = jest.spyOn(testJestHelpers, 'delay').mockResolvedValue(undefined);
    const log = new ToolingLog();
    let count = 0;

    await retryForSuccess(log, {
      block: async () => {
        if (++count < 3) throw new Error('not yet');
      },
      timeout: 10000,
      methodName: 'retryForSuccess default delay test',
    });

    expect(delaySpy).toHaveBeenNthCalledWith(1, DEFAULT_RETRY_DELAY);
    expect(delaySpy).toHaveBeenNthCalledWith(2, DEFAULT_RETRY_DELAY);
    delaySpy.mockRestore();
  });

  it('uses an explicit retryDelay when provided', async () => {
    const delaySpy = jest.spyOn(testJestHelpers, 'delay').mockResolvedValue(undefined);
    const log = new ToolingLog();
    let count = 0;

    await retryForSuccess(log, {
      block: async () => {
        if (++count < 3) throw new Error('not yet');
      },
      timeout: 10000,
      methodName: 'retryForSuccess explicit delay test',
      retryDelay: 250,
    });

    expect(delaySpy).toHaveBeenNthCalledWith(1, 250);
    expect(delaySpy).toHaveBeenNthCalledWith(2, 250);
    delaySpy.mockRestore();
  });

  it('preserves the original delay for retry-count-limited callers', async () => {
    const delaySpy = jest.spyOn(testJestHelpers, 'delay').mockResolvedValue(undefined);
    const log = new ToolingLog();
    let count = 0;

    await retryForSuccess(log, {
      block: async () => {
        if (++count < 3) throw new Error('not yet');
      },
      timeout: 10000,
      methodName: 'retryForSuccess retry count delay test',
      retryCount: 3,
    });

    expect(delaySpy).toHaveBeenNthCalledWith(1, DEFAULT_RETRY_COUNT_DELAY);
    expect(delaySpy).toHaveBeenNthCalledWith(2, DEFAULT_RETRY_COUNT_DELAY);
    delaySpy.mockRestore();
  });
});
