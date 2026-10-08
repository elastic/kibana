/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockWatchdog = {
  start: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  markRunning: jest.fn(),
};
jest.mock('./event_loop_watchdog', () => ({ EventLoopWatchdog: jest.fn(() => mockWatchdog) }));

import { BehaviorSubject, NEVER, Subject } from 'rxjs';
import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';
import type { InternalThreadsStart } from '@kbn/core-threads-server-internal';
import {
  EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
  EventLoopWatchdogService,
  resolveDiagnosticDir,
} from './event_loop_watchdog_service';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './types';

describe('EventLoopWatchdogService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('toggles the watchdog with the feature flag', async () => {
    const service = new EventLoopWatchdogService(mockCoreContext.create());
    service.setup({ status: { overall$: NEVER } });

    const flag$ = new BehaviorSubject(false);
    const featureFlags = coreFeatureFlagsMock.createStart();
    featureFlags.getBooleanValue$.mockReturnValue(flag$);
    service.start({ featureFlags, threads: {} as InternalThreadsStart });
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
      false
    );
    flag$.next(true);
    // toggles are serialised behind the initial (disabled) toggle
    await new Promise(setImmediate);
    expect(mockWatchdog.start).toHaveBeenCalledTimes(1);
    flag$.next(false);
    await new Promise(setImmediate);
    expect(mockWatchdog.stop).toHaveBeenCalledTimes(2); // initial disabled value, then the toggle
    await service.stop();
  });
});

describe('EventLoopWatchdogService startup phase', () => {
  const featureFlags = coreFeatureFlagsMock.createStart();
  featureFlags.getBooleanValue$.mockReturnValue(new BehaviorSubject(true));
  const status = (level: ServiceStatus['level']): ServiceStatus => ({ level, summary: '' });
  let service: EventLoopWatchdogService;
  let overall$: Subject<ServiceStatus>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    overall$ = new Subject();
    service = new EventLoopWatchdogService(mockCoreContext.create());
    service.setup({ status: { overall$ } });
    service.start({ featureFlags, threads: {} as InternalThreadsStart });
  });

  afterEach(async () => {
    await service.stop();
    jest.useRealTimers();
  });

  it('ends a grace period after Kibana is first available', () => {
    overall$.next(status(ServiceStatusLevels.degraded));
    overall$.next(status(ServiceStatusLevels.available));
    jest.advanceTimersByTime(RUNNING_GRACE_MS - 1);
    expect(mockWatchdog.markRunning).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockWatchdog.markRunning).toHaveBeenCalledTimes(1);
    overall$.next(status(ServiceStatusLevels.available));
    jest.advanceTimersByTime(RUNNING_FALLBACK_MS);
    expect(mockWatchdog.markRunning).toHaveBeenCalledTimes(1);
  });

  it('ends after a fallback delay if Kibana never becomes available', () => {
    overall$.next(status(ServiceStatusLevels.degraded));
    jest.advanceTimersByTime(RUNNING_FALLBACK_MS);
    expect(mockWatchdog.markRunning).toHaveBeenCalledTimes(1);
  });
});

describe('resolveDiagnosticDir', () => {
  it('reads --diagnostic-dir from exec arguments or NODE_OPTIONS', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir=/a'], '')).toBe('/a');
    expect(resolveDiagnosticDir([], '--max-old-space-size=1 --diagnostic-dir=/mnt/diag')).toBe(
      '/mnt/diag'
    );
    expect(resolveDiagnosticDir([], '')).toBeUndefined();
  });

  it('takes the last occurrence, as Node does (Serverless overrides the start script default)', () => {
    expect(
      resolveDiagnosticDir(
        [],
        '--heapsnapshot-signal=SIGUSR2 --diagnostic-dir=/usr/share/kibana/data --diagnostic-dir=/mnt/elastic/diagnostics'
      )
    ).toBe('/mnt/elastic/diagnostics');
    expect(resolveDiagnosticDir(['--diagnostic-dir=/cli'], '--diagnostic-dir=/env')).toBe('/cli');
  });
});
