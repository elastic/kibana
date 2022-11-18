/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchAbortController } from './search_abort_controller';

const timeTravel = (msToRun = 0) => {
  jest.advanceTimersByTime(msToRun);
  return new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));
};

describe('search abort controller', () => {
  test('is not aborted when empty', () => {
    const sac = new SearchAbortController();
    expect(sac.getSignal().aborted).toBe(false);
  });

  test('immediately aborts when passed an aborted signal in the constructor', () => {
    const controller = new AbortController();
    controller.abort();
    const sac = new SearchAbortController();
    sac.addAbortSignal(controller.signal);
    expect(sac.getSignal().aborted).toBe(true);
  });

  test('aborts when input signal is aborted', () => {
    const controller = new AbortController();
    const sac = new SearchAbortController();
    sac.addAbortSignal(controller.signal);
    expect(sac.getSignal().aborted).toBe(false);
    controller.abort();
    expect(sac.getSignal().aborted).toBe(true);
  });

  test('aborts when all input signals are aborted', () => {
    const controller = new AbortController();
    const sac = new SearchAbortController();
    sac.addAbortSignal(controller.signal);

    const controller2 = new AbortController();
    sac.addAbortSignal(controller2.signal);
    expect(sac.getSignal().aborted).toBe(false);
    controller.abort();
    expect(sac.getSignal().aborted).toBe(false);
    controller2.abort();
    expect(sac.getSignal().aborted).toBe(true);
  });

  test('aborts explicitly even if all inputs are not aborted', () => {
    const controller = new AbortController();
    const sac = new SearchAbortController();
    sac.addAbortSignal(controller.signal);

    const controller2 = new AbortController();
    sac.addAbortSignal(controller2.signal);

    expect(sac.getSignal().aborted).toBe(false);
    sac.abort();
    expect(sac.getSignal().aborted).toBe(true);
  });

  test('doesnt abort, if cleared', () => {
    const controller = new AbortController();
    const sac = new SearchAbortController();
    sac.addAbortSignal(controller.signal);
    expect(sac.getSignal().aborted).toBe(false);
    sac.cleanup();
    controller.abort();
    expect(sac.getSignal().aborted).toBe(false);
  });

  describe('timeout abort', () => {
    beforeEach(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('doesnt abort on timeout, if cleared', () => {
      const sac = new SearchAbortController(100);
      expect(sac.getSignal().aborted).toBe(false);
      sac.cleanup();
      timeTravel(100);
      expect(sac.getSignal().aborted).toBe(false);
    });

    test('aborts on timeout, even if no signals passed in', () => {
      const sac = new SearchAbortController(100);
      expect(sac.getSignal().aborted).toBe(false);
      timeTravel(100);
      expect(sac.getSignal().aborted).toBe(true);
      expect(sac.isTimeout()).toBe(true);
    });

    test('aborts on timeout, even if there are unaborted signals', () => {
      const controller = new AbortController();
      const sac = new SearchAbortController(100);
      sac.addAbortSignal(controller.signal);

      expect(sac.getSignal().aborted).toBe(false);
      timeTravel(100);
      expect(sac.getSignal().aborted).toBe(true);
      expect(sac.isTimeout()).toBe(true);
    });
  });
});
