/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestScheduler } from 'rxjs/testing';
import { PluginName } from '../plugins';
import { ServiceStatus, ServiceStatusLevel, ServiceStatusLevels } from './types';
import {
  getPluginsStatusChanges,
  getPluginsStatusDiff,
  getServiceLevelChangeMessage,
} from './log_plugins_status';

type ObsInputType = Record<PluginName, ServiceStatus>;

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

const createServiceStatus = (level: ServiceStatusLevel): ServiceStatus => ({
  level,
  summary: 'summary',
});

const createPluginsStatuses = (
  input: Record<PluginName, ServiceStatusLevel>
): Record<PluginName, ServiceStatus> => {
  return Object.entries(input).reduce((output, [name, level]) => {
    output[name] = createServiceStatus(level);
    return output;
  }, {} as Record<PluginName, ServiceStatus>);
};

describe('getPluginsStatusChanges', () => {
  it('does not emit on first plugins$ emission', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statuses = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });

      const overall$ = hot<ObsInputType>('-a', {
        a: statuses,
      });
      const stop$ = hot<void>('');
      const expected = '--';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 1)).toBe(expected);
    });
  });

  it('does not emit if statuses do not change', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statuses = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });

      const overall$ = hot<ObsInputType>('-a-b', {
        a: statuses,
        b: statuses,
      });
      const stop$ = hot<void>('');
      const expected = '----';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 1)).toBe(expected);
    });
  });

  it('emits if any plugin status changes', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statusesA = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });
      const statusesB = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.available,
      });

      const overall$ = hot<ObsInputType>('-a-b', {
        a: statusesA,
        b: statusesB,
      });
      const stop$ = hot<void>('');
      const expected = '---a';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 1)).toBe(expected, {
        a: [
          {
            previousLevel: 'degraded',
            nextLevel: 'available',
            impactedServices: ['pluginB'],
          },
        ],
      });
    });
  });

  it('emits everytime any plugin status changes', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const availableStatus = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
      });
      const degradedStatus = createPluginsStatuses({
        pluginA: ServiceStatusLevels.degraded,
      });

      const overall$ = hot<ObsInputType>('-a-b-c-d', {
        a: availableStatus,
        b: degradedStatus,
        c: degradedStatus,
        d: availableStatus,
      });
      const stop$ = hot<void>('');
      const expected = '---a---b';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 1)).toBe(expected, {
        a: [
          {
            previousLevel: 'available',
            nextLevel: 'degraded',
            impactedServices: ['pluginA'],
          },
        ],
        b: [
          {
            previousLevel: 'degraded',
            nextLevel: 'available',
            impactedServices: ['pluginA'],
          },
        ],
      });
    });
  });

  it('throttle events', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statusesA = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });
      const statusesB = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.available,
      });
      const statusesC = createPluginsStatuses({
        pluginA: ServiceStatusLevels.degraded,
        pluginB: ServiceStatusLevels.available,
      });

      const overall$ = hot<ObsInputType>('-a-b--c', {
        a: statusesA,
        b: statusesB,
        c: statusesC,
      });
      const stop$ = hot<void>('');
      const expected = '------a';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 5)).toBe(expected, {
        a: [
          {
            previousLevel: 'available',
            nextLevel: 'degraded',
            impactedServices: ['pluginA'],
          },
          {
            previousLevel: 'degraded',
            nextLevel: 'available',
            impactedServices: ['pluginB'],
          },
        ],
      });
    });
  });

  it('stops emitting once `stop$` emits', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statusesA = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });
      const statusesB = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.available,
      });
      const statusesC = createPluginsStatuses({
        pluginA: ServiceStatusLevels.degraded,
        pluginB: ServiceStatusLevels.available,
      });

      const overall$ = hot<ObsInputType>('-a-b-c', {
        a: statusesA,
        b: statusesB,
        c: statusesC,
      });
      const stop$ = hot<void>('----(s|)');
      const expected = '---a|';

      expectObservable(getPluginsStatusChanges(overall$, stop$, 1)).toBe(expected, {
        a: [
          {
            previousLevel: 'degraded',
            nextLevel: 'available',
            impactedServices: ['pluginB'],
          },
        ],
      });
    });
  });
});

describe('getPluginsStatusDiff', () => {
  it('returns an empty list if level is the same for all plugins', () => {
    const previousStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.available,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const nextStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.available,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const result = getPluginsStatusDiff(previousStatus, nextStatus);

    expect(result).toEqual([]);
  });

  it('returns an single entry if only one status changed', () => {
    const previousStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.available,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const nextStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.degraded,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const result = getPluginsStatusDiff(previousStatus, nextStatus);

    expect(result).toEqual([
      {
        previousLevel: 'available',
        nextLevel: 'degraded',
        impactedServices: ['pluginA'],
      },
    ]);
  });

  it('groups plugins by previous and next level tuples', () => {
    const previousStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.available,
      pluginB: ServiceStatusLevels.available,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const nextStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.degraded,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const result = getPluginsStatusDiff(previousStatus, nextStatus);

    expect(result).toEqual([
      {
        previousLevel: 'available',
        nextLevel: 'degraded',
        impactedServices: ['pluginA', 'pluginB'],
      },
    ]);
  });

  it('returns one entry per previous and next level tuples', () => {
    const previousStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.available,
      pluginB: ServiceStatusLevels.degraded,
      pluginC: ServiceStatusLevels.unavailable,
    });

    const nextStatus = createPluginsStatuses({
      pluginA: ServiceStatusLevels.degraded,
      pluginB: ServiceStatusLevels.unavailable,
      pluginC: ServiceStatusLevels.available,
    });

    const result = getPluginsStatusDiff(previousStatus, nextStatus);

    expect(result).toEqual([
      {
        previousLevel: 'available',
        nextLevel: 'degraded',
        impactedServices: ['pluginA'],
      },
      {
        previousLevel: 'degraded',
        nextLevel: 'unavailable',
        impactedServices: ['pluginB'],
      },
      {
        previousLevel: 'unavailable',
        nextLevel: 'available',
        impactedServices: ['pluginC'],
      },
    ]);
  });
});

describe('getServiceLevelChangeMessage', () => {
  it('returns a human readable message about the change', () => {
    expect(
      getServiceLevelChangeMessage({
        previousLevel: 'available',
        nextLevel: 'degraded',
        impactedServices: ['pluginA', 'pluginB'],
      })
    ).toMatchInlineSnapshot(
      `"2 plugins changed status from 'available' to 'degraded': pluginA, pluginB"`
    );
  });
});
