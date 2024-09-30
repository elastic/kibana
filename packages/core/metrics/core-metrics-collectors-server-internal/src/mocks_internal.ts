/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type {
  MetricsCollector,
  IntervalHistogram,
  OpsProcessMetrics,
} from '@kbn/core-metrics-server';
import { EventLoopDelaysMonitor } from './event_loop_delays_monitor';

// internal duplicate of metricsCollectorMock
const createCollector = <T = any>(
  collectReturnValue: any = {}
): jest.Mocked<MetricsCollector<T>> => {
  const collector: jest.Mocked<MetricsCollector<T>> = {
    collect: jest.fn().mockResolvedValue(collectReturnValue),
    reset: jest.fn(),
  };

  return collector;
};

export const metricsCollectorMock = {
  create: createCollector,
};

// internal duplicate of process.mocks
function createMockOpsProcessMetrics(): OpsProcessMetrics {
  const histogram = mocked.createHistogram();

  return {
    memory: {
      heap: { total_in_bytes: 1, used_in_bytes: 1, size_limit: 1 },
      resident_set_size_in_bytes: 1,
      array_buffers_in_bytes: 1,
      external_in_bytes: 1,
    },
    event_loop_delay: 1,
    event_loop_delay_histogram: histogram,
    event_loop_utilization: {
      active: 1,
      idle: 1,
      utilization: 1,
    },
    pid: 1,
    uptime_in_millis: 1,
  };
}

// internal duplicate of base collector mock
const createMock = () => {
  const mocked: jest.Mocked<MetricsCollector<any>> = {
    collect: jest.fn(),
    reset: jest.fn(),
  };

  mocked.collect.mockResolvedValue({});

  return mocked;
};

// internal duplicate of `collectorMock` exposed in @kbn/core-metrics-collectors-server-mocks for unit tests*/
export const collectorMock = {
  create: createMock,
  createOpsProcessMetrics: createMockOpsProcessMetrics,
};

// internal duplicate of EventLoopDelay mocks exposed in @kbn/core-metrics-collectors-server-mocks for unit tests
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
