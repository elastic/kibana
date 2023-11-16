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
import { ServiceStatusLevels, ServiceStatus } from '@kbn/core-status-common';
import { logOverallStatusChanges } from './log_overall_status';

const delay = async (millis: number = 10) =>
  await new Promise((resolve) => setTimeout(resolve, millis));

describe('logOverallStatusChanges', () => {
  let overall$: Subject<ServiceStatus>;
  let stop$: Subject<void>;
  let loggerFactory: jest.Mocked<ILoggingSystem>;
  let l: Logger; // using short name for clarity

  beforeEach(() => {
    overall$ = new Subject<ServiceStatus>();
    stop$ = new Subject<void>();
    loggerFactory = loggingSystemMock.create();
    l = loggerFactory.get('status', 'plugins');
  });

  afterEach(() => {
    stop$.next();
    stop$.complete();
    loggingSystemMock.clear(loggerFactory);
  });

  it('emits an initial message after first overall$ emission', async () => {
    logOverallStatusChanges({
      logger: l,
      overall$,
      stop$,
    });

    overall$.next({ level: ServiceStatusLevels.unavailable, summary: 'Initializing . . .' });

    await delay();

    expect(l.get).not.toBeCalled();
    expect(l.info).not.toBeCalled();
    expect(l.warn).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.error).nthCalledWith(1, 'Kibana is now unavailable: Initializing . . .');
  });

  it('emits a new message every time the status level changes', async () => {
    logOverallStatusChanges({
      logger: l,
      overall$,
      stop$,
    });

    overall$.next({ level: ServiceStatusLevels.unavailable, summary: 'Initializing . . .' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting for ES indices' });
    overall$.next({ level: ServiceStatusLevels.available, summary: 'Ready!' });

    await delay();

    expect(l.get).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.error).nthCalledWith(1, 'Kibana is now unavailable: Initializing . . .');
    expect(l.warn).toBeCalledTimes(1);
    expect(l.warn).nthCalledWith(
      1,
      'Kibana is now degraded (was unavailable): Waiting for ES indices'
    );
    expect(l.info).toBeCalledTimes(1);
    expect(l.info).nthCalledWith(1, 'Kibana is now available (was degraded)');
  });

  it('does not emit when the status stays the same', async () => {
    logOverallStatusChanges({
      logger: l,
      overall$,
      stop$,
    });

    overall$.next({ level: ServiceStatusLevels.unavailable, summary: 'Initializing . . .' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting for ES indices' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #2)' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #3)' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #4)' });
    overall$.next({ level: ServiceStatusLevels.available, summary: 'Ready!' });

    await delay();

    expect(l.get).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.error).nthCalledWith(1, 'Kibana is now unavailable: Initializing . . .');
    expect(l.warn).toBeCalledTimes(1);
    expect(l.warn).nthCalledWith(
      1,
      'Kibana is now degraded (was unavailable): Waiting for ES indices'
    );
    expect(l.info).toBeCalledTimes(1);
    expect(l.info).nthCalledWith(1, 'Kibana is now available (was degraded)');
  });

  it('stops emitting once `stop$` emits', async () => {
    logOverallStatusChanges({
      logger: l,
      overall$,
      stop$,
    });

    overall$.next({ level: ServiceStatusLevels.unavailable, summary: 'Initializing . . .' });
    stop$.next();
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting for ES indices' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #2)' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #3)' });
    overall$.next({ level: ServiceStatusLevels.degraded, summary: 'Waiting (attempt #4)' });
    overall$.next({ level: ServiceStatusLevels.available, summary: 'Ready!' });

    await delay();

    expect(l.get).not.toBeCalled();
    expect(l.error).toBeCalledTimes(1);
    expect(l.error).nthCalledWith(1, 'Kibana is now unavailable: Initializing . . .');
    expect(l.warn).not.toBeCalled();
    expect(l.info).not.toBeCalled();
  });
});
