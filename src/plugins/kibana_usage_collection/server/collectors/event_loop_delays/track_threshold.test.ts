/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';

import { mockMonitorPercentile, monitorEventLoopDelay } from './event_loop_delays.mocks';

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
    const collectionWarnThreshold = 1000;
    startTrackingEventLoopDelaysThreshold(
      mockEventLoopCounter,
      logger,
      stopMonitoringEventLoop$,
      collectionWarnThreshold,
      collectionStartDelay
    );

    expect(monitorEventLoopDelay).toBeCalledTimes(1);
    expect(mockMonitorPercentile).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(mockMonitorPercentile).toBeCalled();
  });

  it('logs a warning and increments usage counter when the mean delay exceeds the threshold', () => {
    const collectionStartDelay = 100;
    const collectionInterval = 1000;
    const collectionWarnThreshold = 10;

    startTrackingEventLoopDelaysThreshold(
      mockEventLoopCounter,
      logger,
      stopMonitoringEventLoop$,
      collectionWarnThreshold,
      collectionStartDelay,
      collectionInterval
    );

    expect(logger.warn).toBeCalledTimes(0);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(0);

    jest.advanceTimersByTime(collectionStartDelay);
    expect(logger.warn).toBeCalledTimes(1);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(1);

    jest.advanceTimersByTime(collectionInterval);
    expect(logger.warn).toBeCalledTimes(2);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(2);

    jest.advanceTimersByTime(collectionInterval);
    expect(mockEventLoopCounter.incrementCounter).toBeCalledTimes(3);
    expect(logger.warn).toBeCalledTimes(3);
  });

  // it('does nothing if threshold does not exceed mean delay', () => {
  //   const collectionStartDelay = 100;
  //   const collectionInterval = 1000;
  //   const collectionWarnThreshold = 1000;
  //   startTrackingEventLoopDelaysThreshold(
  //     mockEventLoopCounter,
  //     logger,
  //     stopMonitoringEventLoop$,
  //     collectionWarnThreshold,
  //     collectionStartDelay
  //   );

  //   expect(mockInternalRepository.create).toBeCalledTimes(0);
  //   jest.advanceTimersByTime(collectionStartDelay);
  //   expect(mockInternalRepository.create).toBeCalledTimes(1);
  //   jest.advanceTimersByTime(collectionInterval);
  //   expect(mockInternalRepository.create).toBeCalledTimes(2);
  //   jest.advanceTimersByTime(collectionInterval);
  //   expect(mockInternalRepository.create).toBeCalledTimes(3);
  // });

  // it('resets histogram every histogramReset duration', () => {
  //   const collectionStartDelay = 0;
  //   const collectionInterval = 1000;
  //   const histogramReset = 5000;
  //   startTrackingEventLoopDelaysUsage(
  //     mockInternalRepository,
  //     stopMonitoringEventLoop$,
  //     collectionStartDelay,
  //     collectionInterval,
  //     histogramReset
  //   );

  //   expect(mockMonitorReset).toBeCalledTimes(0);
  //   jest.advanceTimersByTime(collectionInterval * 5);
  //   expect(mockMonitorReset).toBeCalledTimes(1);
  //   jest.advanceTimersByTime(collectionInterval * 5);
  //   expect(mockMonitorReset).toBeCalledTimes(2);
  // });

  // it('stops monitoring event loop delays once stopMonitoringEventLoop$.next is called', () => {
  //   startTrackingEventLoopDelaysUsage(mockInternalRepository, stopMonitoringEventLoop$);

  //   expect(mockMonitorDisable).toBeCalledTimes(0);
  //   stopMonitoringEventLoop$.next();
  //   expect(mockMonitorDisable).toBeCalledTimes(1);
  // });
});
