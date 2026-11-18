/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getManagedInstallRetryDelayMs,
  MANAGED_INSTALL_RETRY_DELAYS_MS,
  waitUnlessAborted,
} from './managed_install_retry';

describe('getManagedInstallRetryDelayMs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('waits between half and all of the delay of the retry', () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(1);

    expect(getManagedInstallRetryDelayMs(2)).toBe(2_000);
    expect(getManagedInstallRetryDelayMs(2)).toBe(4_000);
  });

  it('keeps the last delay for retries past the schedule', () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);

    expect(getManagedInstallRetryDelayMs(MANAGED_INSTALL_RETRY_DELAYS_MS.length + 5)).toBe(60_000);
  });

  it('waits about 5 minutes in all', () => {
    const totalMs = MANAGED_INSTALL_RETRY_DELAYS_MS.reduce((sum, delayMs) => sum + delayMs, 0);

    expect(totalMs).toBeGreaterThanOrEqual(4 * 60_000);
    expect(totalMs).toBeLessThanOrEqual(6 * 60_000);
  });
});

describe('waitUnlessAborted', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after the delay', async () => {
    const resolved = jest.fn();
    void waitUnlessAborted(1_000, new AbortController().signal).then(resolved);

    await jest.advanceTimersByTimeAsync(999);
    expect(resolved).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });

  it('resolves as soon as the signal aborts', async () => {
    const controller = new AbortController();
    const resolved = jest.fn();
    void waitUnlessAborted(60_000, controller.signal).then(resolved);

    controller.abort();
    await jest.advanceTimersByTimeAsync(0);

    expect(resolved).toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves at once when the signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitUnlessAborted(60_000, controller.signal)).resolves.toBeUndefined();
    expect(jest.getTimerCount()).toBe(0);
  });
});
