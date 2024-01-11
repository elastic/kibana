/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ServiceStatusLevels } from '@kbn/core-status-common';
import { logPluginsStatusChanges } from './log_plugins_status';
import type { PluginStatus } from './types';

const delay = async (millis: number = 10) =>
  await new Promise((resolve) => setTimeout(resolve, millis));

describe('logPluginsStatusChanges', () => {
  const reportedUnavailable: PluginStatus = {
    reported: true,
    level: ServiceStatusLevels.unavailable,
    summary: 'Unavail!',
  };
  const reportedAvailable: PluginStatus = {
    reported: true,
    level: ServiceStatusLevels.available,
    summary: 'Avail!',
  };
  const inferredUnavailable: PluginStatus = {
    reported: false,
    level: ServiceStatusLevels.unavailable,
    summary: 'Unavail!',
  };
  const inferredAvailable: PluginStatus = {
    reported: false,
    level: ServiceStatusLevels.available,
    summary: 'Avail!',
  };

  let plugins$: Subject<Record<string, PluginStatus>>;
  let stop$: Subject<void>;
  let loggerFactory: jest.Mocked<ILoggingSystem>;
  let l: Logger; // using short name for clarity

  beforeEach(() => {
    plugins$ = new Subject<Record<string, PluginStatus>>();
    stop$ = new Subject<void>();
    loggerFactory = loggingSystemMock.create();
    l = loggerFactory.get('status', 'plugins');
  });

  afterEach(() => {
    stop$.next();
    stop$.complete();
    loggingSystemMock.clear(loggerFactory);
  });

  it("logs plugins' status changes", async () => {
    logPluginsStatusChanges({
      logger: l,
      plugins$,
      stop$,
    });

    plugins$.next({ A: reportedAvailable, B: reportedUnavailable, C: inferredUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable, C: inferredAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable, C: inferredAvailable });

    await delay();
    expect(l.get).toBeCalledTimes(3);
    expect(l.get).nthCalledWith(1, 'A');
    expect(l.get).nthCalledWith(2, 'B');
    expect(l.get).nthCalledWith(3, 'B');
    expect(l.warn).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.info).toBeCalledTimes(2);
    expect(l.error).nthCalledWith(1, 'B plugin is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(1, 'A plugin is now available: Avail!');
    expect(l.info).nthCalledWith(2, 'B plugin is now available: Avail!');
  });

  it('stops logging when the stop$ observable has emitted', async () => {
    logPluginsStatusChanges({
      logger: l,
      plugins$,
      stop$,
    });

    plugins$.next({ A: reportedAvailable, B: reportedUnavailable, C: inferredUnavailable });
    stop$.next();
    plugins$.next({ A: reportedAvailable, B: reportedAvailable, C: inferredAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable, C: inferredAvailable });

    await delay();

    expect(l.get).toBeCalledTimes(2);
    expect(l.get).nthCalledWith(1, 'A');
    expect(l.get).nthCalledWith(2, 'B');
    expect(l.warn).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.info).toBeCalledTimes(1);
    expect(l.info).nthCalledWith(1, 'A plugin is now available: Avail!');
    expect(l.error).nthCalledWith(1, 'B plugin is now unavailable: Unavail!');
  });

  it('throttles and aggregates messages of plugins that emit too often', async () => {
    logPluginsStatusChanges({
      logger: l,
      plugins$,
      stop$,
      throttleIntervalMillis: 10,
    });

    // A remains unavailable, B is switching repeatedly
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });
    plugins$.next({ A: reportedUnavailable, B: reportedAvailable });
    plugins$.next({ A: reportedUnavailable, B: reportedUnavailable });

    // A becomes available, B keeps switching
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });
    plugins$.next({ A: reportedAvailable, B: reportedUnavailable });
    plugins$.next({ A: reportedAvailable, B: reportedAvailable });

    // give the 'bufferTime' operator enough time to emit and log
    await delay(20);

    expect(l.get).toBeCalledWith('A');
    expect(l.get).toBeCalledWith('B');
    expect(l.get).not.toBeCalledWith('C');
    expect(l.warn).not.toHaveBeenCalled();
    expect(l.info).toHaveBeenCalledTimes(4);
    expect(l.error).toHaveBeenCalledTimes(3);
    expect(l.error).nthCalledWith(1, 'A plugin is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(1, 'B plugin is now available: Avail!');
    expect(l.error).nthCalledWith(2, 'B plugin is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(2, 'B plugin is now available: Avail!');
    expect(l.info).nthCalledWith(3, 'A plugin is now available: Avail!');
    expect(l.error).nthCalledWith(3, 'B plugin is now unavailable: Unavail! (repeated 10 times)');
    expect(l.info).nthCalledWith(4, 'B plugin is now available: Avail! (repeated 10 times)');
  });

  it('discards messages when a plugin emits too many different ones', async () => {
    logPluginsStatusChanges({
      logger: l,
      plugins$,
      stop$,
      throttleIntervalMillis: 10,
      maxThrottledMessages: 4,
    });

    // A plugin keeps changing status, with different messages each time
    let attempt = 0;
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });
    plugins$.next({ A: { ...reportedUnavailable, summary: `attempt #${++attempt}` } });

    // give the 'bufferTime' operator enough time to emit and log
    await delay(20);

    // emit a last message (some time after)
    plugins$.next({ A: { ...reportedAvailable, summary: `attempt #${++attempt}` } });

    expect(l.get).toBeCalledWith('A');
    expect(l.get).not.toBeCalledWith('B');
    expect(l.info).toHaveBeenCalledTimes(5);
    expect(l.error).toHaveBeenCalledTimes(3);
    expect(l.warn).toHaveBeenCalledTimes(1);
    // the first 3 messages are the max allowed per interval
    expect(l.info).nthCalledWith(1, 'A plugin is now available: attempt #1');
    expect(l.error).nthCalledWith(1, 'A plugin is now unavailable: attempt #2');
    expect(l.info).nthCalledWith(2, 'A plugin is now available: attempt #3');
    // the next 4 messages are throttled (emitted after 10ms)
    expect(l.error).nthCalledWith(2, 'A plugin is now unavailable: attempt #4');
    expect(l.info).nthCalledWith(3, 'A plugin is now available: attempt #5');
    expect(l.error).nthCalledWith(3, 'A plugin is now unavailable: attempt #6');
    expect(l.info).nthCalledWith(4, 'A plugin is now available: attempt #7');

    // these messages exceed the maxThrottledMessages quota, truncated + warning
    expect(l.warn).nthCalledWith(
      1,
      '7 other status updates from [A] have been truncated to avoid flooding the logs'
    );
    // and the last message, after the buffered / truncated ones
    expect(l.info).nthCalledWith(5, 'A plugin is now available: attempt #15');
  });
});
