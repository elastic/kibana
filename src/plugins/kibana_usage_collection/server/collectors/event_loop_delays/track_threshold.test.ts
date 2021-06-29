/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import {
  mockMonitorPercentile,
  monitorEventLoopDelay,
  mockMonitorReset,
} from './event_loop_delays.mocks';
import { startTrackingEventLoopDelaysThreshold } from './track_threshold';
import { loggingSystemMock } from '../../../../../core/server/mocks';
import { usageCountersServiceMock } from '../../../../usage_collection/server/usage_counters/usage_counters_service.mock';

describe('startTrackingEventLoopDelaysThreshold', () => {
  const logger = loggingSystemMock.createLogger();
  const stopMonitoringEventLoop$ = new Subject<void>();
  const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
  const mockEventLoopCounter = mockUsageCountersSetup.createUsageCounter('testCounter');

  beforeAll(() => jest.useFakeTimers('modern'));
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => stopMonitoringEventLoop$.next());

  it('initializes EventLoopDelaysCollector and starts timer', () => {
    const collectionStartDelay = 1000;
    const warnThreshold = 1000;
    startTrackingEventLoopDelaysThreshold(mockEventLoopCounter, logger, stopMonitoringEventLoop$, {
      warnThreshold,
      collectionStartDelay,
    });

    expect(monitorEventLoopDelay).toBeCalledTimes(1);
    expect(mockMonitorPercentile).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(mockMonitorPercentile).toBeCalled();
  });

  it('logs a warning and increments usage counter when the mean delay exceeds the threshold', () => {
    const collectionStartDelay = 100;
    const collectionInterval = 1000;
    const warnThreshold = 10;

    startTrackingEventLoopDelaysThreshold(mockEventLoopCounter, logger, stopMonitoringEventLoop$, {
      warnThreshold,
      collectionStartDelay,
      collectionInterval,
    });

    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(mockMonitorReset).toBeCalledTimes(0);

    jest.advanceTimersByTime(collectionStartDelay);
    expect(logger.warn).toBeCalledTimes(1);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(1);
    expect(mockMonitorReset).toBeCalledTimes(1);

    jest.advanceTimersByTime(collectionInterval);
    expect(logger.warn).toBeCalledTimes(2);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(2);
    expect(mockMonitorReset).toBeCalledTimes(2);

    jest.advanceTimersByTime(collectionInterval);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(3);
    expect(logger.warn).toBeCalledTimes(3);
    expect(mockMonitorReset).toBeCalledTimes(3);
  });

  it('does not log warning or increment usage if threshold did not exceed mean delay', () => {
    const collectionStartDelay = 100;
    const warnThreshold = 15;

    startTrackingEventLoopDelaysThreshold(mockEventLoopCounter, logger, stopMonitoringEventLoop$, {
      warnThreshold,
      collectionStartDelay,
    });

    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(mockMonitorReset).toBeCalledTimes(0);

    jest.advanceTimersByTime(collectionStartDelay);
    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);
    expect(mockMonitorReset).toBeCalledTimes(1);
  });
});
