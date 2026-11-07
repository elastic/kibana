/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject, of } from 'rxjs';
import { configServiceMock } from '@kbn/config-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ServiceStatusLevels, type ServiceStatus } from '@kbn/core-status-common';
import { opsConfig } from '../ops_config';
import { EventLoopWatchdog } from './event_loop_watchdog';
import {
  EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
  EVENT_LOOP_WATCHDOG_PROFILING_FEATURE_FLAGS,
  EventLoopWatchdogService,
} from './event_loop_watchdog_service';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './constants';
import { resolveDiagnosticDir } from './resolve_diagnostic_dir';

jest.mock('./event_loop_watchdog');
jest.mock('./resolve_diagnostic_dir');

const EventLoopWatchdogMock = jest.mocked(EventLoopWatchdog);
const resolveDiagnosticDirMock = jest.mocked(resolveDiagnosticDir);

const available: ServiceStatus = { level: ServiceStatusLevels.available, summary: '' };
const degraded: ServiceStatus = { level: ServiceStatusLevels.degraded, summary: '' };
const BG_PROFILING_FLAG = 'core.eventLoopWatchdog.profiling.backgroundTasks.enabled';
const UI_PROFILING_FLAG = 'core.eventLoopWatchdog.profiling.ui.enabled';
const ON = 'Event loop watchdog profiling on for this node';
const OFF = 'Event loop watchdog profiling off for this node';

describe('EventLoopWatchdogService', () => {
  let overall$: BehaviorSubject<ServiceStatus>;
  let flag$: Subject<boolean>;
  let profilingFlags: Record<string, Subject<boolean>>;
  let getBooleanValue$: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.create>;

  const watchdog = () => EventLoopWatchdogMock.mock.instances[0] as jest.Mocked<EventLoopWatchdog>;
  const profilingLines = () =>
    loggingSystemMock
      .collect(logger)
      .info.map(([message]) => message)
      .filter((message) => String(message).includes('profiling o'));
  const params = () => EventLoopWatchdogMock.mock.calls[0][0];

  const setup = async (
    eventLoopWatchdog: Record<string, unknown> = {},
    nodeRoles: readonly string[] = ['background_tasks']
  ) => {
    const ops = opsConfig.schema.validate({ cGroupOverrides: {}, eventLoopWatchdog });
    const configService = configServiceMock.create();
    configService.atPath.mockImplementation((path) =>
      of(path === 'ops' ? ops : { root: { appenders: ['default'], level: 'info' } })
    );
    const service = new EventLoopWatchdogService(mockCoreContext.create({ logger, configService }));
    await service.setup({
      status: { overall$ },
      nodeRoles,
      serviceVersion: '9.3.0',
    });
    return service;
  };
  const start = async (
    eventLoopWatchdog: Record<string, unknown> = {},
    nodeRoles?: readonly string[]
  ) => {
    const service = await setup(eventLoopWatchdog, nodeRoles);
    service.start({ featureFlags: { getBooleanValue$ } });
    return service;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    EventLoopWatchdogMock.mockClear();
    resolveDiagnosticDirMock.mockReset().mockReturnValue('/diag');
    overall$ = new BehaviorSubject(degraded);
    flag$ = new Subject();
    profilingFlags = {};
    getBooleanValue$ = jest.fn((name: string) =>
      name === EVENT_LOOP_WATCHDOG_FEATURE_FLAG ? flag$ : (profilingFlags[name] ??= new Subject())
    );
    logger = loggingSystemMock.create();
  });
  afterEach(() => jest.useRealTimers());

  describe('#setup()', () => {
    it('creates the watchdog from the config', async () => {
      await setup({ statsInterval: '5m' });
      expect(params()).toEqual({
        logger: expect.anything(),
        thresholdsMs: { starting: 200, running: 200 },
        statsIntervalMs: 300_000,
        logging: {
          context: 'metrics.event_loop_watchdog',
          level: 'info',
          format: 'text',
          service: { node: { roles: ['background_tasks'] }, version: '9.3.0', type: 'kibana' },
        },
        profiling: {
          startAfterMs: { starting: 30_000, running: 30_000 },
          maxDurationMs: { starting: 10_000, running: 10_000 },
          cooldownMs: { starting: 60_000, running: 60_000 },
          diagnosticDir: '/diag',
        },
      });
    });

    it('uses blockThreshold for both phases when startup.blockThreshold is unset', async () => {
      await setup({ blockThreshold: '500ms' });
      expect(params().thresholdsMs).toEqual({ starting: 500, running: 500 });
    });

    it('uses startup.blockThreshold for the starting phase when set', async () => {
      await setup({ blockThreshold: '500ms', startup: { blockThreshold: '2s' } });
      expect(params().thresholdsMs).toEqual({ starting: 2000, running: 500 });
    });

    it('uses the profiling settings for both phases when startup.profiling is unset', async () => {
      await setup({ profiling: { startAfter: '1m', maxDuration: '5s', cooldown: '10m' } });
      expect(params().profiling).toMatchObject({
        startAfterMs: { starting: 60_000, running: 60_000 },
        maxDurationMs: { starting: 5_000, running: 5_000 },
        cooldownMs: { starting: 600_000, running: 600_000 },
      });
    });

    it('falls back to each running profiling setting on its own', async () => {
      await setup({
        profiling: { startAfter: '1m' },
        startup: { profiling: { startAfter: '2m', cooldown: '30s' } },
      });
      expect(params().profiling).toMatchObject({
        startAfterMs: { starting: 120_000, running: 60_000 },
        maxDurationMs: { starting: 10_000, running: 10_000 },
        cooldownMs: { starting: 30_000, running: 60_000 },
      });
    });

    it('leaves the diagnostic directory unset when Node has none', async () => {
      resolveDiagnosticDirMock.mockReturnValue(undefined);
      await setup();
      expect(params().profiling.diagnosticDir).toBeUndefined();
    });
  });

  describe('#start()', () => {
    it('throws before setup', () => {
      const service = new EventLoopWatchdogService(mockCoreContext.create({ logger }));
      expect(() => service.start({ featureFlags: { getBooleanValue$ } })).toThrow(
        'EventLoopWatchdogService#setup() must be called before #start()'
      );
    });

    it.each([false, true])('uses enabled: %s as the flag fallback', async (enabled) => {
      await start({ enabled });
      expect(getBooleanValue$).toHaveBeenCalledWith(EVENT_LOOP_WATCHDOG_FEATURE_FLAG, enabled);
    });

    it('starts and stops the watchdog with the flag', async () => {
      await start();
      flag$.next(true);
      expect(watchdog().start).toHaveBeenCalledTimes(1);
      flag$.next(false);
      await Promise.resolve();
      expect(watchdog().stop).toHaveBeenCalledTimes(1);
    });

    it('does not start the watchdog while the flag is off', async () => {
      await start();
      flag$.next(false);
      await Promise.resolve();
      expect(watchdog().start).not.toHaveBeenCalled();
    });

    it('ignores repeated flag values', async () => {
      await start();
      flag$.next(true);
      flag$.next(true);
      expect(watchdog().start).toHaveBeenCalledTimes(1);
    });

    it('waits for a stop to finish before starting again', async () => {
      await start();
      let finishStop!: () => void;
      watchdog().stop.mockImplementation(() => new Promise((resolve) => (finishStop = resolve)));
      flag$.next(true);
      flag$.next(false);
      flag$.next(true);
      await Promise.resolve();
      expect(watchdog().start).toHaveBeenCalledTimes(1);
      finishStop();
      await new Promise(jest.requireActual('timers').setImmediate);
      expect(watchdog().start).toHaveBeenCalledTimes(2);
    });

    it('logs a failed toggle and keeps following the flag', async () => {
      await start();
      watchdog().start.mockImplementationOnce(() => {
        throw new Error('boom');
      });
      flag$.next(true);
      await Promise.resolve();
      expect(logger.get().warn).toHaveBeenCalledWith(
        'Failed to toggle the event loop watchdog: boom'
      );
      expect(logger.get().debug).toHaveBeenCalledWith(
        expect.stringMatching(/^Failed to toggle the event loop watchdog: Error: boom\n\s+at /)
      );
      flag$.next(false);
      flag$.next(true);
      await new Promise(jest.requireActual('timers').setImmediate);
      expect(watchdog().start).toHaveBeenCalledTimes(2);
    });

    it('logs a flag error and stops the watchdog, without throwing', async () => {
      await start();
      flag$.next(true);
      expect(() => flag$.error(new Error('provider broke'))).not.toThrow();
      jest.runOnlyPendingTimers();
      expect(logger.get().error).toHaveBeenCalledWith(
        'Stopping the event loop watchdog: its feature flag failed: provider broke'
      );
      expect(logger.get().debug).toHaveBeenCalledWith(
        expect.stringMatching(/its feature flag failed: Error: provider broke\n\s+at /)
      );
      expect(watchdog().stop).toHaveBeenCalledTimes(1);
    });

    it('logs a status error without throwing, and still marks running after the fallback', async () => {
      await start();
      expect(() => overall$.error(new Error('status broke'))).not.toThrow();
      expect(logger.get().error).toHaveBeenCalledWith(
        "Event loop watchdog can't follow Kibana's status: status broke"
      );
      expect(logger.get().debug).toHaveBeenCalledWith(
        expect.stringMatching(/follow Kibana's status: Error: status broke\n\s+at /)
      );
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS - 1);
      expect(watchdog().markRunning).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(watchdog().markRunning).toHaveBeenCalledTimes(1);
    });

    it('counts the fallback from start, not setup', async () => {
      const service = await setup();
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS);
      service.start({ featureFlags: { getBooleanValue$ } });
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS - 1);
      expect(watchdog().markRunning).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(watchdog().markRunning).toHaveBeenCalledTimes(1);
    });

    it('marks running 30s after the overall status is first available', async () => {
      await start();
      overall$.next(available);
      jest.advanceTimersByTime(RUNNING_GRACE_MS - 1);
      expect(watchdog().markRunning).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(watchdog().markRunning).toHaveBeenCalledTimes(1);
    });

    it('marks running after the fallback when Kibana never becomes available', async () => {
      await start();
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS - 1);
      expect(watchdog().markRunning).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(watchdog().markRunning).toHaveBeenCalledTimes(1);
    });

    it('marks running only once', async () => {
      await start();
      overall$.next(available);
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS * 2);
      overall$.next(degraded);
      overall$.next(available);
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS);
      expect(watchdog().markRunning).toHaveBeenCalledTimes(1);
    });
  });

  describe('profiling flags', () => {
    it('names one flag per profiled role', () => {
      expect(EVENT_LOOP_WATCHDOG_PROFILING_FEATURE_FLAGS).toEqual({
        background_tasks: BG_PROFILING_FLAG,
        ui: UI_PROFILING_FLAG,
      });
    });

    it.each([
      [['background_tasks'], [BG_PROFILING_FLAG]],
      [['ui'], [UI_PROFILING_FLAG]],
      [
        ['background_tasks', 'ui'],
        [BG_PROFILING_FLAG, UI_PROFILING_FLAG],
      ],
      [['migrator'], []],
    ])('with roles %j, reads %j with a false fallback', async (roles, flags) => {
      await start({ enabled: true }, roles);
      const read = getBooleanValue$.mock.calls.filter(
        ([name]) => name !== EVENT_LOOP_WATCHDOG_FEATURE_FLAG
      );
      expect(read).toEqual(flags.map((flag) => [flag, false]));
    });

    it.each([
      ['background_tasks', BG_PROFILING_FLAG],
      ['ui', UI_PROFILING_FLAG],
    ])('turns profiling on and off with the %s flag, and logs each change', async (role, flag) => {
      await start({}, [role]);
      profilingFlags[flag].next(false);
      profilingFlags[flag].next(true);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(true);
      profilingFlags[flag].next(false);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(false);
      expect(profilingLines()).toEqual([ON, OFF]);
    });

    it('does nothing while the profiling flags have never been on', async () => {
      await start({}, ['background_tasks', 'ui']);
      profilingFlags[BG_PROFILING_FLAG].next(false);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      expect(watchdog().setProfiling).not.toHaveBeenCalled();
      expect(profilingLines()).toEqual([]);
    });

    it("profiles when any of the node's role flags are on", async () => {
      await start({}, ['background_tasks', 'ui']);
      profilingFlags[BG_PROFILING_FLAG].next(false);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      profilingFlags[UI_PROFILING_FLAG].next(true);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(true);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(true);
      profilingFlags[BG_PROFILING_FLAG].next(false);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(false);
    });

    it("doesn't profile a node without a matching role flag", async () => {
      await start({}, ['migrator']);
      flag$.next(true);
      expect(watchdog().setProfiling).not.toHaveBeenCalled();
    });

    it('only updates profiling when the combined state changes', async () => {
      await start({}, ['background_tasks', 'ui']);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      profilingFlags[UI_PROFILING_FLAG].next(true);
      profilingFlags[BG_PROFILING_FLAG].next(false);
      expect(watchdog().setProfiling).toHaveBeenCalledTimes(1);
    });

    it.each(['before', 'after'])(
      'applies profiling when its flag arrives %s the watchdog flag',
      async (order) => {
        await start();
        const enableProfiling = () => profilingFlags[BG_PROFILING_FLAG].next(true);
        if (order === 'before') {
          enableProfiling();
        }
        flag$.next(true);
        if (order === 'after') {
          enableProfiling();
        }
        expect(watchdog().start).toHaveBeenCalledTimes(1);
        expect(watchdog().setProfiling).toHaveBeenLastCalledWith(true);
      }
    );

    it('toggles profiling without restarting the watchdog', async () => {
      await start();
      flag$.next(true);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      profilingFlags[BG_PROFILING_FLAG].next(false);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      await Promise.resolve();
      expect(watchdog().start).toHaveBeenCalledTimes(1);
      expect(watchdog().stop).not.toHaveBeenCalled();
    });

    it("treats a failed profiling flag as off and keeps following the node's other flag", async () => {
      await start({}, ['background_tasks', 'ui']);
      flag$.next(true);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      profilingFlags[UI_PROFILING_FLAG].next(false);
      expect(() =>
        profilingFlags[BG_PROFILING_FLAG].error(new Error('provider failed'))
      ).not.toThrow();
      expect(logger.get().error).toHaveBeenCalledWith(
        `Profiling flag ${BG_PROFILING_FLAG} failed, treating it as off: provider failed`
      );
      expect(logger.get().debug).toHaveBeenCalledWith(
        expect.stringMatching(/treating it as off: Error: provider failed\n\s+at /)
      );
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(false);
      profilingFlags[UI_PROFILING_FLAG].next(true);
      expect(watchdog().setProfiling).toHaveBeenLastCalledWith(true);
      expect(watchdog().stop).not.toHaveBeenCalled();
    });
  });

  describe('#stop()', () => {
    it('stops following the flag and the status, and stops the watchdog', async () => {
      const service = await start();
      await service.stop();
      expect(watchdog().stop).toHaveBeenCalledTimes(1);
      flag$.next(true);
      profilingFlags[BG_PROFILING_FLAG].next(true);
      expect(watchdog().setProfiling).not.toHaveBeenCalled();
      overall$.next(available);
      jest.advanceTimersByTime(RUNNING_FALLBACK_MS);
      expect(watchdog().start).not.toHaveBeenCalled();
      expect(watchdog().markRunning).not.toHaveBeenCalled();
    });

    it('resolves before setup', async () => {
      const service = new EventLoopWatchdogService(mockCoreContext.create({ logger }));
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
