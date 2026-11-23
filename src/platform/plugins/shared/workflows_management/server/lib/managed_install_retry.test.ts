/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeRetryDelayMs } from '@kbn/workflows';
import {
  MANAGED_INSTALL_MAX_RETRIES,
  MANAGED_INSTALL_RETRY_DELAY,
  waitUnlessAborted,
} from './managed_install_retry';

describe('MANAGED_INSTALL_RETRY_DELAY', () => {
  it('doubles from 1 s to 8 s with jitter, about 15 s in all', () => {
    const nominalDelaysMs = [1_000, 2_000, 4_000, 8_000];
    expect(MANAGED_INSTALL_MAX_RETRIES).toBe(nominalDelaysMs.length);

    for (let run = 0; run < 20; run++) {
      nominalDelaysMs.forEach((nominalMs, retry) => {
        const delayMs = computeRetryDelayMs(MANAGED_INSTALL_RETRY_DELAY, retry);
        expect(delayMs).toBeGreaterThanOrEqual(nominalMs / 2);
        expect(delayMs).toBeLessThanOrEqual(nominalMs);
      });
    }
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
