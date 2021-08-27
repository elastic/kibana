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
  mockMonitorDisable,
} from './event_loop_delays.mocks';
import { savedObjectsRepositoryMock } from '../../../../../core/server/mocks';
import { startTrackingEventLoopDelaysUsage } from './track_delays';

describe('startTrackingEventLoopDelaysUsage', () => {
  const mockInternalRepository = savedObjectsRepositoryMock.create();
  const stopMonitoringEventLoop$ = new Subject<void>();

  beforeAll(() => jest.useFakeTimers('modern'));
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => stopMonitoringEventLoop$.next());

  it('initializes EventLoopDelaysCollector and starts timer', () => {
    const collectionStartDelay = 1000;
    startTrackingEventLoopDelaysUsage(mockInternalRepository, stopMonitoringEventLoop$, {
      collectionStartDelay,
    });

    expect(monitorEventLoopDelay).toBeCalledTimes(1);
    expect(mockMonitorPercentile).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(mockMonitorPercentile).toBeCalled();
  });

  it('stores event loop delays every collectionInterval duration', () => {
    const collectionStartDelay = 100;
    const collectionInterval = 1000;
    startTrackingEventLoopDelaysUsage(mockInternalRepository, stopMonitoringEventLoop$, {
      collectionStartDelay,
      collectionInterval,
    });

    expect(mockInternalRepository.create).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionStartDelay);
    expect(mockInternalRepository.create).toBeCalledTimes(1);
    jest.advanceTimersByTime(collectionInterval);
    expect(mockInternalRepository.create).toBeCalledTimes(2);
    jest.advanceTimersByTime(collectionInterval);
    expect(mockInternalRepository.create).toBeCalledTimes(3);
  });

  it('resets histogram every histogramReset duration', () => {
    const collectionStartDelay = 0;
    const collectionInterval = 1000;
    const histogramReset = 5000;
    startTrackingEventLoopDelaysUsage(mockInternalRepository, stopMonitoringEventLoop$, {
      collectionStartDelay,
      collectionInterval,
      histogramReset,
    });

    expect(mockMonitorReset).toBeCalledTimes(0);
    jest.advanceTimersByTime(collectionInterval * 5);
    expect(mockMonitorReset).toBeCalledTimes(1);
    jest.advanceTimersByTime(collectionInterval * 5);
    expect(mockMonitorReset).toBeCalledTimes(2);
  });

  it('stops monitoring event loop delays once stopMonitoringEventLoop$.next is called', () => {
    startTrackingEventLoopDelaysUsage(mockInternalRepository, stopMonitoringEventLoop$);

    expect(mockMonitorDisable).toBeCalledTimes(0);
    stopMonitoringEventLoop$.next();
    expect(mockMonitorDisable).toBeCalledTimes(1);
  });
});
