/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PluginName } from '../plugins';
import { PluginsStatusService } from './plugins_status';
import { of, Observable, BehaviorSubject } from 'rxjs';
import { ServiceStatusLevels, CoreStatus, ServiceStatus } from './types';
import { first } from 'rxjs/operators';
import { ServiceStatusLevelSnapshotSerializer } from './test_utils';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

describe('PluginStatusService', () => {
  const pluginDependencies: Map<PluginName, PluginName[]> = new Map([
    ['a', []],
    ['b', ['a']],
    ['c', ['a', 'b']],
  ]);

  describe('getDerivedStatus$', () => {
    it('defaults to available', async () => {
      const service = new PluginsStatusService({ pluginDependencies });
      expect(await service.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.available,
        summary: 'Available',
      });
    });
  });

  describe('getAll$', () => {
    it('defaults to empty record if no plugins', async () => {
      const service = new PluginsStatusService({
        pluginDependencies: new Map(),
      });
      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({});
    });

    it('defaults to available when no plugin statuses are set', async () => {
      const service = new PluginsStatusService({
        pluginDependencies,
      });
      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'Available' },
        b: { level: ServiceStatusLevels.available, summary: 'Available' },
        c: { level: ServiceStatusLevels.available, summary: 'Available' },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a status' }));

      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.degraded, summary: 'a status' },
        b: { level: ServiceStatusLevels.available, summary: 'Available' },
        c: { level: ServiceStatusLevels.available, summary: 'Available' },
      });
    });

    it('updates when a new plugin status observable is set', async () => {
      const service = new PluginsStatusService({
        pluginDependencies: new Map([['a', []]]),
      });
      const statusUpdates: Array<Record<PluginName, ServiceStatus>> = [];
      const subscription = service
        .getAll$()
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));

      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a degraded' }));
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a unavailable' }));
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a available' }));
      subscription.unsubscribe();

      expect(statusUpdates).toEqual([
        { a: { level: ServiceStatusLevels.available, summary: 'Available' } },
        { a: { level: ServiceStatusLevels.degraded, summary: 'a degraded' } },
        { a: { level: ServiceStatusLevels.unavailable, summary: 'a unavailable' } },
        { a: { level: ServiceStatusLevels.available, summary: 'a available' } },
      ]);
    });
  });

  describe('getDependenciesStatus$', () => {
    it('only includes dependencies of specified plugin', async () => {
      const service = new PluginsStatusService({
        pluginDependencies,
      });
      expect(await service.getDependenciesStatus$('a').pipe(first()).toPromise()).toEqual({});
      expect(await service.getDependenciesStatus$('b').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'Available' },
      });
      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'Available' },
        b: { level: ServiceStatusLevels.available, summary: 'Available' },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a status' }));

      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.degraded, summary: 'a status' },
        b: { level: ServiceStatusLevels.available, summary: 'Available' },
      });
    });

    it('throws error if unknown plugin passed', () => {
      const service = new PluginsStatusService({ pluginDependencies });
      expect(() => {
        service.getDependenciesStatus$('doesnt-exist');
      }).toThrowError();
    });

    it('debounces events in quick succession', async () => {
      const service = new PluginsStatusService({
        pluginDependencies,
      });
      const available: ServiceStatus = {
        level: ServiceStatusLevels.available,
        summary: 'a available',
      };
      const degraded: ServiceStatus = {
        level: ServiceStatusLevels.degraded,
        summary: 'a degraded',
      };
      const pluginA$ = new BehaviorSubject(available);
      service.set('a', pluginA$);

      const statusUpdates: Array<Record<string, ServiceStatus>> = [];
      const subscription = service
        .getDependenciesStatus$('b')
        .subscribe((status) => statusUpdates.push(status));
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      // Waiting for the debounce timeout should cut a new update
      await delay(500);
      pluginA$.next(available);
      await delay(500);
      subscription.unsubscribe();

      expect(statusUpdates).toMatchInlineSnapshot(`
        Array [
          Object {
            "a": Object {
              "level": degraded,
              "summary": "a degraded",
            },
          },
          Object {
            "a": Object {
              "level": available,
              "summary": "a available",
            },
          },
        ]
      `);
    });
  });
});
