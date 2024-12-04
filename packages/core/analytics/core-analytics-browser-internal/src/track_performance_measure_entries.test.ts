/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { trackPerformanceMeasureEntries } from './track_performance_measure_entries';
import { analyticsClientMock } from './analytics_service.test.mocks';

interface MockEntryList {
  getEntries: () => [object];
}
type ObsCallback = (_entries: MockEntryList, _obs: object) => undefined;
const mockObs = { observe: jest.fn, disconnect: jest.fn };

const setupMockPerformanceObserver = (entries: [object]) => {
  const mockPerformanceObserver = function (callback: ObsCallback) {
    callback(
      {
        getEntries: () => entries,
      },
      mockObs
    );
    return mockObs;
  };

  (global.PerformanceObserver as unknown) = mockPerformanceObserver;
};

describe('trackPerformanceMeasureEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("doesn't report an analytics event when not receiving events", () => {
    setupMockPerformanceObserver([{}]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(0);
  });

  test("doesn't report an analytics event when receiving not 'kibana:performance' events", () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'measure',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'anything',
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(0);
  });

  test("doesn't report an analytics event when receiving not 'measure' events", () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'anything',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(0);
  });

  test('reports an analytics event when receiving "measure" and "kibana:performance" events', () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'measure',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
  });

  test('reports an analytics event ignoring keys and values not allowed', () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'measure',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          customMetrics: {
            key1: 'key1',
            value1: 'value1',
            key10: 'key10',
            value10: 'value10',
            anyKey: 'anyKey',
            anyValue: 'anyValue',
          },
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('performance_metric', {
      duration: 1000,
      eventName: 'kibana:plugin_render_time',
      key1: 'key1',
      meta: { target: '/' },
      value1: 'value1',
    });
  });

  test('reports an analytics event with query metadata', () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'measure',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          meta: {
            rangeFrom: 1704067200000, // 01/01/2024 @ 00:00am
            rangeTo: 1704153600000, // 01/02/2024 @ 00:00am
          },
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('performance_metric', {
      duration: 1000,
      eventName: 'kibana:plugin_render_time',
      meta: { target: '/', query_range_secs: 86400 },
    });
  });
  test('reports undefined query_range_secs when rangeFrom is greater than rangeTo', () => {
    setupMockPerformanceObserver([
      {
        name: '/',
        entryType: 'measure',
        startTime: 100,
        duration: 1000,
        detail: {
          eventName: 'kibana:plugin_render_time',
          type: 'kibana:performance',
          meta: {
            rangeTo: 1704067200000, // 01/01/2024 @ 00:00am
            rangeFrom: 1704153600000, // 01/02/2024 @ 00:00am
          },
        },
      },
    ]);
    trackPerformanceMeasureEntries(analyticsClientMock, true);

    expect(analyticsClientMock.reportEvent).toHaveBeenCalledTimes(1);
    expect(analyticsClientMock.reportEvent).toHaveBeenCalledWith('performance_metric', {
      duration: 1000,
      eventName: 'kibana:plugin_render_time',
      meta: { target: '/', query_range_secs: undefined },
    });
  });
});
