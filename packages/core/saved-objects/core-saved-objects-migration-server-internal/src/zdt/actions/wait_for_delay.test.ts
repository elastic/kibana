/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitForDelay } from './wait_for_delay';

const nextTick = () => new Promise<void>((resolve) => resolve());
const aFewTicks = () => nextTick().then(nextTick).then(nextTick);

describe('waitForDelay', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('resolves after the specified amount of time', async () => {
    const handler = jest.fn();

    waitForDelay({ delayInSec: 5 })().then(handler);

    expect(handler).not.toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    await aFewTicks();

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
