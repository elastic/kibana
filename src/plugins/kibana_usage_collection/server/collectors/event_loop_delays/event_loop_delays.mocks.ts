/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IntervalHistogram } from './event_loop_delays';

export const mockMonitorEnable = jest.fn();
export const mockMonitorPercentile = jest.fn();
export const mockMonitorReset = jest.fn();
export const mockMonitorDisable = jest.fn();
export const monitorEventLoopDelay = jest.fn().mockReturnValue({
  enable: mockMonitorEnable,
  percentile: mockMonitorPercentile,
  disable: mockMonitorDisable,
  reset: mockMonitorReset,
});

jest.doMock('perf_hooks', () => ({
  monitorEventLoopDelay,
}));

function createMockHistogram(overwrites: Partial<IntervalHistogram> = {}): IntervalHistogram {
  return {
    min: 9093120,
    max: 53247999,
    mean: 11993238.600747818,
    exceeds: 0,
    stddev: 1168191.9357543814,
    percentiles: {
      '50': 12607487,
      '75': 12615679,
      '95': 12648447,
      '99': 12713983,
    },
    ...overwrites,
  };
}

export const mocked = {
  createHistogram: createMockHistogram,
};
