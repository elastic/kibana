/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { InternalThreadsStart } from '@kbn/core-threads-server-internal';
import moment from 'moment';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';
import { MockEventLoopWatchdog, mockWatchdog } from './event_loop_watchdog_service.test.mocks';
import {
  EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
  EventLoopWatchdogService,
  resolveWorkerLogging,
  toWatchdogOptions,
} from './event_loop_watchdog_service';
import { opsConfig } from '../ops_config';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('EventLoopWatchdogService', () => {
  let flag$: BehaviorSubject<boolean>;
  let featureFlags: ReturnType<typeof coreFeatureFlagsMock.createStart>;
  let service: EventLoopWatchdogService;
  let threads: InternalThreadsStart;

  beforeEach(() => {
    jest.clearAllMocks();
    threads = { createWorker: jest.fn() };
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
    await service.start({ featureFlags, threads });
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
      false
    );
    expect(MockEventLoopWatchdog).toHaveBeenCalledTimes(1);
    expect(MockEventLoopWatchdog).toHaveBeenCalledWith(expect.objectContaining({ threads }));
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
    await service.start({ featureFlags, threads });
    await service.stop();
    const stops = mockWatchdog.stop.mock.calls.length;
    flag$.next(true);
    await flush();
    expect(mockWatchdog.start).not.toHaveBeenCalled();
    expect(stops).toBeGreaterThanOrEqual(1);
  });
});

describe('toWatchdogOptions profiling', () => {
  it('defaults to profiling blocks of at least 2s with a long cooldown', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({});
    expect(toWatchdogOptions({ eventLoopWatchdog })).toEqual(
      expect.objectContaining({
        profileAfterMs: 2_000,
        maxProfileDurationMs: 10_000,
        profileCooldownMs: 600_000,
      })
    );
  });

  it('never profiles before the block threshold and polls twice per profile deadline', () => {
    const { eventLoopWatchdog } = opsConfig.schema.validate({
      eventLoopWatchdog: {
        threshold: '3s',
        profileAfter: '1s',
        heartbeatInterval: '10s',
        maxProfileDuration: '100ms',
      },
    });
    const options = toWatchdogOptions({ eventLoopWatchdog });
    expect(options.profileAfterMs).toBe(20_000); // threshold is raised to 2 heartbeats
    expect(options.pollIntervalMs).toBe(50);
  });
});

describe('resolveWorkerLogging', () => {
  const resolveLiveNoticeFormat = (...args: Parameters<typeof resolveWorkerLogging>) =>
    resolveWorkerLogging(...args).format;
  const name = 'metrics.event_loop_watchdog';
  const appenders = new Map([
    ['json', { type: 'console', layout: { type: 'json' } }],
    ['file', { type: 'file', layout: { type: 'json' } }],
  ]);

  it('defaults to text on the built-in console appender', () => {
    expect(resolveLiveNoticeFormat({}, name)).toBe('text');
  });

  it('follows the root appenders when no logger is configured', () => {
    expect(resolveLiveNoticeFormat({ appenders, root: { appenders: ['json'] } }, name)).toBe(
      'json'
    );
    expect(resolveLiveNoticeFormat({ appenders, root: { appenders: ['file'] } }, name)).toBe(
      undefined
    );
  });

  it('uses the nearest configured ancestor logger', () => {
    const root = { appenders: ['json'] };
    expect(
      resolveLiveNoticeFormat({ appenders, root, loggers: [{ name, appenders: ['file'] }] }, name)
    ).toBeUndefined();
    expect(
      resolveLiveNoticeFormat(
        { appenders, root, loggers: [{ name: 'metrics', appenders: ['console'] }] },
        name
      )
    ).toBe('text');
    // a logger without appenders inherits them from its ancestors
    expect(
      resolveLiveNoticeFormat({ appenders, root, loggers: [{ name, level: 'debug' }] }, name)
    ).toBe('json');
  });

  it('passes the effective level to the worker so it can filter each severity', () => {
    expect(resolveWorkerLogging({ loggers: [{ name: 'metrics', level: 'error' }] }, name)).toEqual({
      context: name,
      level: 'error',
      format: 'text',
    });
    expect(resolveWorkerLogging({ root: { level: 'off' } }, name).level).toBe('off');
    expect(
      resolveWorkerLogging({ root: { level: 'error' }, loggers: [{ name, level: 'debug' }] }, name)
        .level
    ).toBe('debug');
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
    expect(moment.isDuration(eventLoopWatchdog.profileAfter)).toBe(true);
    expect(moment.isDuration(eventLoopWatchdog.threshold)).toBe(true);
  });
});
