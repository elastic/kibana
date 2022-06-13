/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { savedObjectsRepositoryMock, metricsServiceMock } from '@kbn/core/server/mocks';
import { startTrackingEventLoopDelaysUsage } from './track_delays';

describe('startTrackingEventLoopDelaysUsage', () => {
  const eventLoopDelaysMonitor = metricsServiceMock.createEventLoopDelaysMonitor();
  const mockInternalRepository = savedObjectsRepositoryMock.create();
  const stopMonitoringEventLoop$ = new Subject<void>();
  const instanceUuid = 'mock_uuid';

  beforeAll(() => jest.useFakeTimers('modern'));
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => stopMonitoringEventLoop$.next());

  it('collects eventLoopDelaysMonitor metrics after start delay', () => {
    const collectionStartDelay = 1000;
    startTrackingEventLoopDelaysUsage(
      mockInternalRepository,
      instanceUuid,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        collectionStartDelay,
      }
    );

    expect(eventLoopDelaysMonitor.collect).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(eventLoopDelaysMonitor.collect).toBeCalledTimes(1);
  });

  it('stores event loop delays every collectionInterval duration', () => {
    const collectionStartDelay = 100;
    const collectionInterval = 1000;
    startTrackingEventLoopDelaysUsage(
      mockInternalRepository,
      instanceUuid,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        collectionStartDelay,
        collectionInterval,
      }
    );

    expect(mockInternalRepository.create).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(mockInternalRepository.create).toBeCalledTimes(1);
    jest.advanceTimersByTime(collectionInterval);
    expect(mockInternalRepository.create).toBeCalledTimes(2);
    jest.advanceTimersByTime(collectionInterval);
    expect(mockInternalRepository.create).toBeCalledTimes(3);
  });

  it('resets eventLoopDelaysMonitor every histogramReset duration', () => {
    const collectionStartDelay = 0;
    const collectionInterval = 1000;
    const histogramReset = 5000;

    startTrackingEventLoopDelaysUsage(
      mockInternalRepository,
      instanceUuid,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor,
      {
        collectionStartDelay,
        collectionInterval,
        histogramReset,
      }
    );

    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionInterval * 5);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(1);
    jest.advanceTimersByTime(collectionInterval * 5);
    expect(eventLoopDelaysMonitor.reset).toBeCalledTimes(2);
  });

  it('stops monitoring event loop delays once stopMonitoringEventLoop$.next is called', () => {
    startTrackingEventLoopDelaysUsage(
      mockInternalRepository,
      instanceUuid,
      stopMonitoringEventLoop$,
      eventLoopDelaysMonitor
    );
    expect(eventLoopDelaysMonitor.stop).toBeCalledTimes(0);
    stopMonitoringEventLoop$.next();
    expect(eventLoopDelaysMonitor.stop).toBeCalledTimes(1);
  });
});
