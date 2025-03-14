/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { IntervalHistogram } from '@kbn/core-metrics-server';
import type { EventLoopDelaysMonitor } from '@kbn/core-metrics-collectors-server-internal';

function createMockRawNsDataHistogram(
  overwrites: Partial<IntervalHistogram> = {}
): IntervalHistogram {
  const now = Date.now();

  const mockedRawCollectedDataInNs = {
    min: 9093120,
    max: 53247999,
    mean: 11993238,
    exceeds: 0,
    stddev: 1168191,
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
  return mockedRawCollectedDataInNs;
}

function createMockMonitorDataMsHistogram(
  overwrites: Partial<IntervalHistogram> = {}
): IntervalHistogram {
  const now = Date.now();

  const mockedRawCollectedDataInMs = {
    min: 9.09312,
    max: 53.247999,
    mean: 11.993238,
    exceeds: 0,
    stddev: 1.168191,
    fromTimestamp: moment(now).toISOString(),
    lastUpdatedAt: moment(now).toISOString(),
    percentiles: {
      '50': 12.607487,
      '75': 12.615679,
      '95': 12.648447,
      '99': 12.713983,
    },
    ...overwrites,
  };
  return mockedRawCollectedDataInMs;
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

  mockCollect.mockReturnValue(createMockMonitorDataMsHistogram()); // this must mock the return value of the public collect method from this monitor.

  return new MockEventLoopDelaysMonitor();
}

export const mocked = {
  createHistogram: createMockRawNsDataHistogram, // raw data as received from Node.js perf_hooks.monitorEventLoopDelay([options])
  createEventLoopDelaysMonitor: createMockEventLoopDelaysMonitor,
};
