/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestScheduler } from 'rxjs/testing';
import { ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';
import { getOverallStatusChanges } from './log_overall_status';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const createStatus = (parts: Partial<ServiceStatus> = {}): ServiceStatus => ({
  level: ServiceStatusLevels.available,
  summary: 'summary',
  ...parts,
});

describe('getOverallStatusChanges', () => {
  it('emits an initial message after first overall$ emission', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const overall$ = hot<ServiceStatus>('--a', {
        a: createStatus(),
      });
      const stop$ = hot<void>('');
      const expected = '--a';

      expectObservable(getOverallStatusChanges(overall$, stop$)).toBe(expected, {
        a: 'Kibana is now available',
      });
    });
  });

  it('emits a new message every time the status level changes', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const overall$ = hot<ServiceStatus>('--a--b', {
        a: createStatus({
          level: ServiceStatusLevels.degraded,
        }),
        b: createStatus({
          level: ServiceStatusLevels.available,
        }),
      });
      const stop$ = hot<void>('');
      const expected = '--a--b';

      expectObservable(getOverallStatusChanges(overall$, stop$)).toBe(expected, {
        a: 'Kibana is now degraded',
        b: 'Kibana is now available (was degraded)',
      });
    });
  });

  it('does not emit when the status stays the same', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const overall$ = hot<ServiceStatus>('--a--b--c', {
        a: createStatus({
          level: ServiceStatusLevels.degraded,
          summary: 'summary 1',
        }),
        b: createStatus({
          level: ServiceStatusLevels.degraded,
          summary: 'summary 2',
        }),
        c: createStatus({
          level: ServiceStatusLevels.available,
          summary: 'summary 2',
        }),
      });
      const stop$ = hot<void>('');
      const expected = '--a-----b';

      expectObservable(getOverallStatusChanges(overall$, stop$)).toBe(expected, {
        a: 'Kibana is now degraded',
        b: 'Kibana is now available (was degraded)',
      });
    });
  });

  it('stops emitting once `stop$` emits', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const overall$ = hot<ServiceStatus>('--a--b', {
        a: createStatus({
          level: ServiceStatusLevels.degraded,
        }),
        b: createStatus({
          level: ServiceStatusLevels.available,
        }),
      });
      const stop$ = hot<void>('----(s|)');
      const expected = '--a-|';

      expectObservable(getOverallStatusChanges(overall$, stop$)).toBe(expected, {
        a: 'Kibana is now degraded',
      });
    });
  });
});
