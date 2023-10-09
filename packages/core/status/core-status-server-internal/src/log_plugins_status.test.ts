/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestScheduler } from 'rxjs/testing';

import type { PluginName } from '@kbn/core-base-common';
import {
  type ServiceStatus,
  type ServiceStatusLevel,
  ServiceStatusLevels,
} from '@kbn/core-status-common';

import { getPluginsStatusChanges, getPluginStatusChangesMessages } from './log_plugins_status';

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
  it('emits on first plugins$ emission', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statuses = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });

      const overall$ = hot<ObsInputType>('-a', {
        a: statuses,
      });
      const stop$ = hot<void>('');
      expectObservable(getPluginsStatusChanges(overall$, stop$)).toBe('-x', {
        x: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
          total: 2,
          updated: 2,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
        },
      });
    });
  });

  it('does not emit if statuses do not change', () => {
    getTestScheduler().run(({ expectObservable, hot }) => {
      const statuses = createPluginsStatuses({
        pluginA: ServiceStatusLevels.available,
        pluginB: ServiceStatusLevels.degraded,
      });

      const overall$ = hot<ObsInputType>('-a-b-c', {
        a: statuses,
        b: statuses,
        c: statuses,
      });
      const stop$ = hot<void>('');

      expectObservable(getPluginsStatusChanges(overall$, stop$)).toBe('-x', {
        x: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
          total: 2,
          updated: 2,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
        },
      });
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
      const expected = '-x-y';

      expectObservable(getPluginsStatusChanges(overall$, stop$)).toBe(expected, {
        x: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
          total: 2,
          updated: 2,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
        },
        y: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
          total: 2,
          updated: 1,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
        },
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
      const expected = '-x-y---x';

      expectObservable(getPluginsStatusChanges(overall$, stop$)).toBe(expected, {
        x: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
          total: 1,
          updated: 1,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
        },
        y: {
          status: {
            available: [],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
          total: 1,
          updated: 1,
          updates: {
            available: [],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
        },
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
      const expected = '-x-y|';

      expectObservable(getPluginsStatusChanges(overall$, stop$)).toBe(expected, {
        x: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
          total: 2,
          updated: 2,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [
              {
                level: ServiceStatusLevels.degraded,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            unavailable: [],
          },
        },
        y: {
          status: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginA',
                summary: 'summary',
              },
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
          total: 2,
          updated: 1,
          updates: {
            available: [
              {
                level: ServiceStatusLevels.available,
                pluginName: 'pluginB',
                summary: 'summary',
              },
            ],
            critical: [],
            degraded: [],
            unavailable: [],
          },
        },
      });
    });
  });
});

describe('getPluginStatusChangesMessages', () => {
  it('returns a list of human readable messages describing the changes', () => {
    expect(
      getPluginStatusChangesMessages({
        status: {
          available: [
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'alreadyAvailablePlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'alreadyAvailablePluginDependantPlugin1',
              summary: 'summary',
            },
          ],

          critical: [
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'alreadyCriticalPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'alreadyCriticalPluginDependantPlugin1',
              summary: 'summary',
            },
          ],

          degraded: [
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'newlyDegradedPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'newlyDegradedPluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'anotherNewlyDegradedPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'anotherNewlyDegradedPluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'alreadyDegradedPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'alreadyDegradedPluginDependantPlugin1',
              summary: 'summary',
            },
          ],

          unavailable: [],
        },
        total: 2,
        updated: 2,
        updates: {
          available: [
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.available,
              pluginName: 'newlyAvailablePluginDependantPlugin2',
              summary: 'summary',
            },
          ],

          critical: [],
          degraded: [
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'newlyDegradedPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'newlyDegradedPluginDependantPlugin1',
              summary: 'summary',
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'anotherNewlyDegradedPlugin',
              summary: 'summary',
              isReportedStatus: true,
            },
            {
              level: ServiceStatusLevels.degraded,
              pluginName: 'anotherNewlyDegradedPluginDependantPlugin1',
              summary: 'summary',
            },
          ],

          unavailable: [],
        },
      })
    ).toMatchInlineSnapshot(`
      Array [
        "'newlyAvailablePlugin' (and 2 more) are now available: summary",
        "The following plugins are now degraded: newlyDegradedPlugin, anotherNewlyDegradedPlugin (and 2 more)
       - 'newlyDegradedPlugin' is now degraded: summary
       - 'anotherNewlyDegradedPlugin' is now degraded: summary",
        "'alreadyCriticalPlugin' plugin (and some others that depend on it) are critical: summary",
        "'alreadyDegradedPlugin' plugin (and some others that depend on it) are degraded: summary",
      ]
    `);
  });
});
