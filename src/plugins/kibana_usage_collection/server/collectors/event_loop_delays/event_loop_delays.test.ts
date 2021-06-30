/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockMonitorEnable,
  mockMonitorPercentile,
  monitorEventLoopDelay,
  mockMonitorReset,
  mockMonitorDisable,
} from './event_loop_delays.mocks';
import { EventLoopDelaysCollector } from './event_loop_delays';

describe('EventLoopDelaysCollector', () => {
  jest.useFakeTimers('modern');
  const mockNow = jest.getRealSystemTime();
  jest.setSystemTime(mockNow);

  beforeEach(() => jest.clearAllMocks());
  afterAll(() => jest.useRealTimers());

  test('#constructor enables monitoring', () => {
    new EventLoopDelaysCollector();
    expect(monitorEventLoopDelay).toBeCalledWith({ resolution: 10 });
    expect(mockMonitorEnable).toBeCalledTimes(1);
  });

  test('#collect returns event loop delays histogram', () => {
    const eventLoopDelaysCollector = new EventLoopDelaysCollector();
    const histogramData = eventLoopDelaysCollector.collect();
    expect(mockMonitorPercentile).toHaveBeenNthCalledWith(1, 50);
    expect(mockMonitorPercentile).toHaveBeenNthCalledWith(2, 75);
    expect(mockMonitorPercentile).toHaveBeenNthCalledWith(3, 95);
    expect(mockMonitorPercentile).toHaveBeenNthCalledWith(4, 99);

    expect(Object.keys(histogramData)).toMatchInlineSnapshot(`
      Array [
        "min",
        "max",
        "mean",
        "exceeds",
        "stddev",
        "fromTimestamp",
        "lastUpdatedAt",
        "percentiles",
      ]
    `);
  });
  test('#reset resets histogram data', () => {
    const eventLoopDelaysCollector = new EventLoopDelaysCollector();
    eventLoopDelaysCollector.reset();
    expect(mockMonitorReset).toBeCalledTimes(1);
  });
  test('#stop disables monitoring event loop delays', () => {
    const eventLoopDelaysCollector = new EventLoopDelaysCollector();
    eventLoopDelaysCollector.stop();
    expect(mockMonitorDisable).toBeCalledTimes(1);
  });
});
