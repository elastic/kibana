/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { yieldToEventLoop } from './yield_to_event_loop';

describe('yieldToEventLoop', () => {
  let now = 0;

  beforeEach(async () => {
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    // Start each test right after a yield, far from the previous test's clock.
    now += 1_000_000;
    await yieldToEventLoop();
    jest.spyOn(global, 'setImmediate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not yield before the budget has passed', async () => {
    now += 24;

    await yieldToEventLoop();

    expect(setImmediate).not.toHaveBeenCalled();
  });

  it('yields once the budget has passed and restarts the budget', async () => {
    now += 25;
    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(1);

    now += 24;
    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(1);

    now += 1;
    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(2);
  });

  it('makes concurrent callers wait for the same yield', async () => {
    now += 25;

    await Promise.all([yieldToEventLoop(), yieldToEventLoop(), yieldToEventLoop()]);

    expect(setImmediate).toHaveBeenCalledTimes(1);
  });
});
