/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { loggingSystemMock, metricsServiceMock } from '@kbn/core/server/mocks';
import { startTrackingEventLoopDelaysThreshold } from './track_threshold';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';

describe('startTrackingEventLoopDelaysThreshold', () => {
  const logger = loggingSystemMock.createLogger();
  const stopMonitoringEventLoop$ = new Subject<void>();
  const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
  const mockEventLoopCounter = mockUsageCountersSetup.createUsageCounter('testCounter');
  const eventLoopDelaysMonitor = metricsServiceMock.createEventLoopDelaysMonitor();

  beforeAll(() => jest.useFakeTimers('modern'));
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => stopMonitoringEventLoop$.next());

  it('initializes EventLoopDelaysCollector and starts timer', () => {
    const collectionStartDelay = 1000;
    const warnThreshold = 1000;
    startTrackingEventLoopDelaysThreshold(
      mockEventLoopCounter,
      logger,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        warnThreshold,
        collectionStartDelay,
      }
    );

    expect(eventLoopDelaysMonitor.collect).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(eventLoopDelaysMonitor.collect).toBeCalledTimes(1);
  });

  it('logs a warning and increments usage counter when the mean delay exceeds the threshold', () => {
    const collectionStartDelay = 100;
    const collectionInterval = 1000;
    const warnThreshold = 10;

    startTrackingEventLoopDelaysThreshold(
      mockEventLoopCounter,
      logger,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        warnThreshold,
        collectionStartDelay,
        collectionInterval,
      }
    );

    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(0);

    jest.advanceTimersByTime(collectionStartDelay);
    expect(logger.warn).toBeCalledTimes(1);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(1);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(1);

    jest.advanceTimersByTime(collectionInterval);
    expect(logger.warn).toBeCalledTimes(2);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(2);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(2);

    jest.advanceTimersByTime(collectionInterval);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(3);
    expect(logger.warn).toBeCalledTimes(3);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(3);
  });

  it('does not log warning or increment usage if threshold did not exceed mean delay', () => {
    const collectionStartDelay = 100;
    const warnThreshold = 15;

    startTrackingEventLoopDelaysThreshold(
      mockEventLoopCounter,
      logger,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        warnThreshold,
        collectionStartDelay,
      }
    );

    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(0);

    jest.advanceTimersByTime(collectionStartDelay);
    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(1);
  });
});
