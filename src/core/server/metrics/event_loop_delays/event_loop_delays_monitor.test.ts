/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
jest.mock('perf_hooks');
import { monitorEventLoopDelay } from 'perf_hooks';
import { EventLoopDelaysMonitor } from './event_loop_delays_monitor';
import { mocked } from './event_loop_delays_monitor.mocks';

describe('EventLoopDelaysMonitor', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
    const mockNow = jest.getRealSystemTime();
    jest.setSystemTime(mockNow);
  });
  afterEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  test('#constructor enables monitoring', () => {
    const eventLoopDelaysMonitor = new EventLoopDelaysMonitor();
    expect(monitorEventLoopDelay).toBeCalledTimes(1);
    expect(eventLoopDelaysMonitor['loopMonitor'].enable).toBeCalledTimes(1);
  });

  test('#collect returns event loop delays histogram', () => {
    const eventLoopDelaysMonitor = new EventLoopDelaysMonitor();
    expect(eventLoopDelaysMonitor['loopMonitor'].disable).toBeCalledTimes(0);
    expect(eventLoopDelaysMonitor['loopMonitor'].enable).toBeCalledTimes(1);
    const histogramData = eventLoopDelaysMonitor.collect();
    expect(eventLoopDelaysMonitor['loopMonitor'].disable).toBeCalledTimes(1);
    expect(eventLoopDelaysMonitor['loopMonitor'].enable).toBeCalledTimes(2);
    expect(eventLoopDelaysMonitor['loopMonitor'].percentile).toHaveBeenNthCalledWith(1, 50);
    expect(eventLoopDelaysMonitor['loopMonitor'].percentile).toHaveBeenNthCalledWith(2, 75);
    expect(eventLoopDelaysMonitor['loopMonitor'].percentile).toHaveBeenNthCalledWith(3, 95);
    expect(eventLoopDelaysMonitor['loopMonitor'].percentile).toHaveBeenNthCalledWith(4, 99);

    // mocked perf_hook returns `mocked.createHistogram()`.
    // This ensures that the wiring of the `collect` function is correct.
    const mockedHistogram = mocked.createHistogram();
    expect(histogramData).toEqual(mockedHistogram);
  });

  test('#reset resets histogram data', () => {
    const eventLoopDelaysMonitor = new EventLoopDelaysMonitor();
    eventLoopDelaysMonitor.reset();
    expect(eventLoopDelaysMonitor['loopMonitor'].reset).toBeCalledTimes(1);
  });
  test('#stop disables monitoring event loop delays', () => {
    const eventLoopDelaysMonitor = new EventLoopDelaysMonitor();
    expect(eventLoopDelaysMonitor['loopMonitor'].disable).toBeCalledTimes(0);
    eventLoopDelaysMonitor.stop();
    expect(eventLoopDelaysMonitor['loopMonitor'].disable).toBeCalledTimes(1);
  });
});
