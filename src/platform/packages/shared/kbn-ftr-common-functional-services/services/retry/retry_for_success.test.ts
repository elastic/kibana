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

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " [2mdebg[22m --- retryForSuccess unit test error: whoops, could not find anything - Attempt #: 1",
        " [2mdebg[22m handled failure",
        " [2mdebg[22m --- retryForSuccess unit test failed again with the same message... - Attempt #: 2",
        " [2mdebg[22m handled failure",
      ]
    `);
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
});
