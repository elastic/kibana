/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEventLoopYielder } from './create_event_loop_yielder';

describe('createEventLoopYielder', () => {
  let now: number;

  beforeEach(() => {
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest.spyOn(global, 'setImmediate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not yield before the budget has passed', async () => {
    const yieldToEventLoop = createEventLoopYielder(25);
    now = 24;

    await yieldToEventLoop();

    expect(setImmediate).not.toHaveBeenCalled();
  });

  it('yields once the budget has passed and restarts the budget', async () => {
    const yieldToEventLoop = createEventLoopYielder(25);
    now = 25;

    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(1);

    now = 49;
    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(1);

    now = 50;
    await yieldToEventLoop();
    expect(setImmediate).toHaveBeenCalledTimes(2);
  });
});
