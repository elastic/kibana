/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { describe, expect, it } from '@jest/globals';
import { warn } from 'cypress-cloud/lib/log';
import { Event, pubsub } from 'cypress-cloud/lib/pubsub';
import { random } from 'lodash';
import { runTillDoneOrCancelled } from '../cancellable';
import { runTillDone } from '../runner';

jest.mock('../runner', () => ({
  runTillDone: jest.fn().mockResolvedValue({}),
}));
jest.mock('cypress-cloud/lib/log', () => ({
  warn: jest.fn(),
}));

jest.spyOn(console, 'warn');

describe('runTillDoneOrCancelled', () => {
  let result: any = null;

  beforeEach(() => {
    jest.resetAllMocks();
    result = null;
  });

  it('resolves when runTillDone resolves', async () => {
    const _result = random(1, 100);
    (runTillDone as jest.Mock).mockImplementationOnce(async () => {
      result = _result;
    });
    // @ts-expect-error
    await runTillDoneOrCancelled({});
    expect(runTillDone).toHaveBeenCalled();
    expect(result).toEqual(_result);
    expect(pubsub.listeners(Event.RUN_CANCELLED)).toHaveLength(0);
  });

  it('rejects when runTillDone rejects', async () => {
    (runTillDone as jest.Mock).mockRejectedValue(new Error('runTillDone error'));
    // @ts-expect-error
    await expect(runTillDoneOrCancelled()).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(pubsub.listeners(Event.RUN_CANCELLED)).toHaveLength(0);
  });

  it('cancels the run when the RUN_CANCELLED event is emitted', async () => {
    const cancelReason = 'Test cancel reason';

    // define a long-running task
    (runTillDone as jest.Mock).mockImplementation(() => {
      return new Promise((_resolve, _reject) => {
        setTimeout(() => {
          _resolve('whatever');
        }, 2000);
      });
    });

    // schedule firing the event
    setTimeout(() => {
      pubsub.emit(Event.RUN_CANCELLED, cancelReason);
    }, 100);

    // @ts-expect-error
    await runTillDoneOrCancelled();
    expect(runTillDone).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.any(String), cancelReason);
    expect(pubsub.listeners(Event.RUN_CANCELLED)).toHaveLength(0);
  });
});
