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
  EventLoopWatchdogService,
} from './event_loop_watchdog_service';
import { RUNNING_FALLBACK_MS, RUNNING_GRACE_MS } from './types';

jest.mock('./event_loop_watchdog');

const EventLoopWatchdogMock = jest.mocked(EventLoopWatchdog);

const available: ServiceStatus = { level: ServiceStatusLevels.available, summary: '' };
const degraded: ServiceStatus = { level: ServiceStatusLevels.degraded, summary: '' };

describe('EventLoopWatchdogService', () => {
  let overall$: BehaviorSubject<ServiceStatus>;
  let flag$: Subject<boolean>;
  let getBooleanValue$: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.create>;

  const watchdog = () => EventLoopWatchdogMock.mock.instances[0] as jest.Mocked<EventLoopWatchdog>;
  const params = () => EventLoopWatchdogMock.mock.calls[0][0];

  const setup = async (eventLoopWatchdog: Record<string, unknown> = {}) => {
    const ops = opsConfig.schema.validate({ cGroupOverrides: {}, eventLoopWatchdog });
    const configService = configServiceMock.create();
    configService.atPath.mockImplementation((path) =>
      of(path === 'ops' ? ops : { root: { appenders: ['default'], level: 'info' } })
    );
    const service = new EventLoopWatchdogService(mockCoreContext.create({ logger, configService }));
    await service.setup({
      status: { overall$ },
      nodeRoles: ['background_tasks'],
      serviceVersion: '9.3.0',
    });
    return service;
  };
  const start = async (eventLoopWatchdog: Record<string, unknown> = {}) => {
    const service = await setup(eventLoopWatchdog);
    service.start({ featureFlags: { getBooleanValue$ } });
    return service;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    EventLoopWatchdogMock.mockClear();
    overall$ = new BehaviorSubject(degraded);
    flag$ = new Subject();
    getBooleanValue$ = jest.fn(() => flag$);
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
      expect(watchdog().stop).toHaveBeenCalledTimes(1);
    });

    it('logs a status error without throwing', async () => {
      await start();
      expect(() => overall$.error(new Error('status broke'))).not.toThrow();
      jest.runOnlyPendingTimers();
      expect(logger.get().error).toHaveBeenCalledWith(
        "Event loop watchdog can't follow Kibana's status: status broke"
      );
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

  describe('#stop()', () => {
    it('stops following the flag and the status, and stops the watchdog', async () => {
      const service = await start();
      await service.stop();
      expect(watchdog().stop).toHaveBeenCalledTimes(1);
      flag$.next(true);
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
