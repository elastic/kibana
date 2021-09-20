/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import type { EventLoopDelaysMonitor } from './event_loop_delays_monitor';
import type { IntervalHistogram } from '../types';

function createMockHistogram(overwrites: Partial<IntervalHistogram> = {}): IntervalHistogram {
  const now = Date.now();

  return {
    min: 9093120,
    max: 53247999,
    mean: 11993238.600747818,
    exceeds: 0,
    stddev: 1168191.9357543814,
    fromTimestamp: moment(now).toISOString(),
    lastUpdatedAt: moment(now).toISOString(),
    percentiles: {
      '50': 12607487,
      '75': 12615679,
      '95': 12648447,
      '99': 12713983,
    },
    ...overwrites,
  };
}

function createMockEventLoopDelaysMonitor() {
  const mockCollect = jest.fn();
  const MockEventLoopDelaysMonitor: jest.MockedClass<typeof EventLoopDelaysMonitor> = jest
    .fn()
    .mockReturnValue({
      collect: mockCollect,
      reset: jest.fn(),
      stop: jest.fn(),
    });

  mockCollect.mockReturnValue(createMockHistogram());

  return new MockEventLoopDelaysMonitor();
}

export const mocked = {
  createHistogram: createMockHistogram,
  createEventLoopDelaysMonitor: createMockEventLoopDelaysMonitor,
};
