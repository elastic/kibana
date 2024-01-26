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
import { type CoreStatus, ServiceStatusLevels, ServiceStatus } from '@kbn/core-status-common';
import { logCoreStatusChanges } from './log_core_services_status';

const delay = async (millis: number = 10) =>
  await new Promise((resolve) => setTimeout(resolve, millis));

describe('logCoreStatusChanges', () => {
  const serviceUnavailable: ServiceStatus = {
    level: ServiceStatusLevels.unavailable,
    summary: 'Unavail!',
  };
  const serviceAvailable: ServiceStatus = {
    level: ServiceStatusLevels.available,
    summary: 'Avail!',
  };

  let core$: Subject<CoreStatus>;
  let stop$: Subject<void>;
  let loggerFactory: jest.Mocked<ILoggingSystem>;
  let l: Logger; // using short name for clarity

  beforeEach(() => {
    core$ = new Subject<CoreStatus>();
    stop$ = new Subject<void>();
    loggerFactory = loggingSystemMock.create();
    l = loggerFactory.get('status', 'plugins');
  });

  afterEach(() => {
    stop$.next();
    stop$.complete();
    loggingSystemMock.clear(loggerFactory);
  });

  it("logs core services' status changes", async () => {
    logCoreStatusChanges({
      logger: l,
      core$,
      stop$,
    });

    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceUnavailable });
    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceAvailable });
    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceAvailable });

    await delay();

    expect(l.get).toBeCalledTimes(3);
    expect(l.get).nthCalledWith(1, 'elasticsearch');
    expect(l.get).nthCalledWith(2, 'savedObjects');
    expect(l.get).nthCalledWith(3, 'savedObjects');
    expect(l.warn).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.info).toBeCalledTimes(2);
    expect(l.info).nthCalledWith(1, 'elasticsearch service is now available: Avail!');
    expect(l.error).nthCalledWith(1, 'savedObjects service is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(2, 'savedObjects service is now available: Avail!');
  });

  it('stops logging when the stop$ observable has emitted', async () => {
    logCoreStatusChanges({
      logger: l,
      core$,
      stop$,
    });

    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceUnavailable });
    stop$.next();
    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceAvailable });
    core$.next({ elasticsearch: serviceAvailable, savedObjects: serviceAvailable });

    await delay();

    expect(l.get).toBeCalledTimes(2);
    expect(l.get).nthCalledWith(1, 'elasticsearch');
    expect(l.get).nthCalledWith(2, 'savedObjects');
    expect(l.warn).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.info).toBeCalledTimes(1);
    expect(l.info).nthCalledWith(1, 'elasticsearch service is now available: Avail!');
    expect(l.error).nthCalledWith(1, 'savedObjects service is now unavailable: Unavail!');
  });

  it('throttles and aggregates messages of plugins that emit too often', async () => {
    logCoreStatusChanges({
      logger: l,
      core$,
      stop$,
      throttleIntervalMillis: 10,
    });

    // savedObjects remains unavailable, elasticsearch is switching repeatedly
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceUnavailable, elasticsearch: serviceUnavailable });

    // savedObjects becomes available, elasticsearch keeps switching
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceUnavailable });
    core$.next({ savedObjects: serviceAvailable, elasticsearch: serviceAvailable });

    // give the 'bufferTime' operator enough time to emit and log
    await delay(20);

    expect(l.get).toBeCalledWith('elasticsearch');
    expect(l.get).toBeCalledWith('savedObjects');
    expect(l.warn).not.toHaveBeenCalled();
    expect(l.info).toHaveBeenCalledTimes(4);
    expect(l.error).toHaveBeenCalledTimes(3);
    expect(l.error).nthCalledWith(1, 'savedObjects service is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(1, 'elasticsearch service is now available: Avail!');
    expect(l.error).nthCalledWith(2, 'elasticsearch service is now unavailable: Unavail!');
    expect(l.info).nthCalledWith(2, 'elasticsearch service is now available: Avail!');
    expect(l.info).nthCalledWith(3, 'savedObjects service is now available: Avail!');
    expect(l.error).nthCalledWith(
      3,
      'elasticsearch service is now unavailable: Unavail! (repeated 10 times)'
    );
    expect(l.info).nthCalledWith(
      4,
      'elasticsearch service is now available: Avail! (repeated 10 times)'
    );
  });

  it('discards messages when a plugin emits too many different ones', async () => {
    logCoreStatusChanges({
      logger: l,
      core$,
      stop$,
      throttleIntervalMillis: 10,
      maxThrottledMessages: 4,
    });

    // elasticsearch service keeps changing status, with different messages each time
    let attempt = 0;
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceUnavailable, summary: `attempt #${++attempt}` },
    });

    // give the 'bufferTime' operator enough time to emit and log
    await delay(20);

    // emit a last message (some time after)
    core$.next({
      savedObjects: serviceUnavailable,
      elasticsearch: { ...serviceAvailable, summary: `attempt #${++attempt}` },
    });

    expect(l.get).toBeCalledWith('elasticsearch');
    expect(l.get).toBeCalledWith('savedObjects');
    expect(l.info).toHaveBeenCalledTimes(5);
    expect(l.error).toHaveBeenCalledTimes(4);
    expect(l.warn).toHaveBeenCalledTimes(1);
    // the first 3 messages are the max allowed per interval
    expect(l.info).nthCalledWith(1, 'elasticsearch service is now available: attempt #1');
    expect(l.error).nthCalledWith(1, 'savedObjects service is now unavailable: Unavail!');
    expect(l.error).nthCalledWith(2, 'elasticsearch service is now unavailable: attempt #2');
    expect(l.info).nthCalledWith(2, 'elasticsearch service is now available: attempt #3');
    // the next 4 messages are throttled (emitted after 10ms)
    expect(l.error).nthCalledWith(3, 'elasticsearch service is now unavailable: attempt #4');
    expect(l.info).nthCalledWith(3, 'elasticsearch service is now available: attempt #5');
    expect(l.error).nthCalledWith(4, 'elasticsearch service is now unavailable: attempt #6');
    expect(l.info).nthCalledWith(4, 'elasticsearch service is now available: attempt #7');

    // these messages exceed the maxThrottledMessages quota, truncated + warning
    expect(l.warn).nthCalledWith(
      1,
      '7 other status updates from [elasticsearch] have been truncated to avoid flooding the logs'
    );
    // and the last message, after the buffered / truncated ones
    expect(l.info).nthCalledWith(5, 'elasticsearch service is now available: attempt #15');
  });
});
