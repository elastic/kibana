/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';
import { MockEventLoopWatchdog, mockWatchdog } from './event_loop_watchdog_service.test.mocks';
import {
  EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
  EventLoopWatchdogService,
  resolveLiveNoticeFormat,
  toWatchdogOptions,
} from './event_loop_watchdog_service';
import { opsConfig } from '../ops_config';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('EventLoopWatchdogService', () => {
  let flag$: BehaviorSubject<boolean>;
  let featureFlags: ReturnType<typeof coreFeatureFlagsMock.createStart>;
  let service: EventLoopWatchdogService;

  beforeEach(() => {
    jest.clearAllMocks();
    const coreContext = mockCoreContext.create();
    const ops = opsConfig.schema.validate({});
    coreContext.configService.atPath.mockImplementation((path) =>
      path === 'ops' ? new BehaviorSubject(ops) : new BehaviorSubject({})
    );
    flag$ = new BehaviorSubject(false);
    featureFlags = coreFeatureFlagsMock.createStart();
    featureFlags.getBooleanValue$.mockReturnValue(flag$);
    service = new EventLoopWatchdogService(coreContext);
  });

  it('registers the execution context observer during setup', () => {
    const executionContext = executionContextServiceMock.createInternalSetupContract();
    service.setup({ executionContext });
    expect(executionContext.registerActivityObserver).toHaveBeenCalledWith(expect.any(Function));
  });

  it('follows the feature flag, defaulting to disabled', async () => {
    await service.start({ featureFlags });
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
      false
    );
    expect(MockEventLoopWatchdog).toHaveBeenCalledTimes(1);
    await flush();
    expect(mockWatchdog.start).not.toHaveBeenCalled();

    flag$.next(true);
    await flush();
    flag$.next(true);
    await flush();
    expect(mockWatchdog.start).toHaveBeenCalledTimes(1);

    flag$.next(false);
    await flush();
    expect(mockWatchdog.stop).toHaveBeenCalledTimes(2); // initial false + explicit false

    flag$.next(true);
    await flush();
    expect(mockWatchdog.start).toHaveBeenCalledTimes(2);
  });

  it('stops the watchdog and the subscription on stop', async () => {
    await service.start({ featureFlags });
    await service.stop();
    const stops = mockWatchdog.stop.mock.calls.length;
    flag$.next(true);
    await flush();
    expect(mockWatchdog.start).not.toHaveBeenCalled();
    expect(stops).toBeGreaterThanOrEqual(1);
  });
});

describe('resolveLiveNoticeFormat', () => {
  it('uses json when a root appender is a console appender with a json layout', () => {
    const appenders = new Map([
      ['console', { type: 'console', layout: { type: 'json' } }],
      ['file', { type: 'file', layout: { type: 'pattern' } }],
    ]);
    expect(resolveLiveNoticeFormat({ appenders, root: { appenders: ['console'] } })).toBe('json');
    expect(resolveLiveNoticeFormat({ appenders, root: { appenders: ['file'] } })).toBe('text');
    expect(resolveLiveNoticeFormat({ root: { appenders: ['default'] } })).toBe('text');
  });
});

describe('toWatchdogOptions', () => {
  it('derives poll interval and never lets the threshold drop below two heartbeats', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({
      eventLoopWatchdog: { threshold: '50ms', heartbeatInterval: '100ms' },
    });
    expect(toWatchdogOptions({ eventLoopWatchdog })).toEqual(
      expect.objectContaining({ thresholdMs: 200, heartbeatIntervalMs: 100, pollIntervalMs: 50 })
    );
    expect(moment.isDuration(eventLoopWatchdog.threshold)).toBe(true);
  });

  it('polls at least twice per profile deadline', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({
      eventLoopWatchdog: { heartbeatInterval: '10s', maxProfileDuration: '100ms' },
    });
    expect(toWatchdogOptions({ eventLoopWatchdog }).pollIntervalMs).toBe(50);
  });
});
