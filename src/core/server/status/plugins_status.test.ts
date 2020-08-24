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
  const coreAllAvailable$: Observable<CoreStatus> = of({
    elasticsearch: { level: ServiceStatusLevels.available, summary: 'elasticsearch avail' },
    savedObjects: { level: ServiceStatusLevels.available, summary: 'savedObjects avail' },
  });
  const coreOneDegraded$: Observable<CoreStatus> = of({
    elasticsearch: { level: ServiceStatusLevels.available, summary: 'elasticsearch avail' },
    savedObjects: { level: ServiceStatusLevels.degraded, summary: 'savedObjects degraded' },
  });
  const coreOneCriticalOneDegraded$: Observable<CoreStatus> = of({
    elasticsearch: { level: ServiceStatusLevels.critical, summary: 'elasticsearch critical' },
    savedObjects: { level: ServiceStatusLevels.degraded, summary: 'savedObjects degraded' },
  });
  const pluginDependencies: Map<PluginName, PluginName[]> = new Map([
    ['a', []],
    ['b', ['a']],
    ['c', ['a', 'b']],
  ]);

  describe('getDerivedStatus$', () => {
    it(`defaults to core's most severe status`, async () => {
      const serviceAvailable = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await serviceAvailable.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.available,
        summary: 'All dependencies are available',
      });

      const serviceDegraded = new PluginsStatusService({
        core$: coreOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceDegraded.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '[savedObjects]: savedObjects degraded',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });

      const serviceCritical = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceCritical.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.critical,
        summary: '[elasticsearch]: elasticsearch critical',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`allows dependencies status to take precedence over lower severity core statuses`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a is not working' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '[a]: a is not working',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`allows core status to take precedence over lower severity dependencies statuses`, async () => {
      const service = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a is not working' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.critical,
        summary: '[elasticsearch]: elasticsearch critical',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`allows a severe dependency status to take precedence over a less severe dependency status`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a is degraded' }));
      service.set('b', of({ level: ServiceStatusLevels.unavailable, summary: 'b is not working' }));
      expect(await service.getDerivedStatus$('c').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '[b]: b is not working',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });
  });

  describe('getAll$', () => {
    it('defaults to empty record if no plugins', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies: new Map(),
      });
      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({});
    });

    it('defaults to core status when no plugin statuses are set', async () => {
      const serviceAvailable = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await serviceAvailable.getAll$().pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
        b: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
        c: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });

      const serviceDegraded = new PluginsStatusService({
        core$: coreOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceDegraded.getAll$().pipe(first()).toPromise()).toEqual({
        a: {
          level: ServiceStatusLevels.degraded,
          summary: '[savedObjects]: savedObjects degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '[3] services are degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });

      const serviceCritical = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceCritical.getAll$().pipe(first()).toPromise()).toEqual({
        a: {
          level: ServiceStatusLevels.critical,
          summary: '[elasticsearch]: elasticsearch critical',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.critical,
          summary: '[2] services are critical',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.critical,
          summary: '[3] services are critical',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a status' }));

      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a status' }, // a is available depsite savedObjects being degraded
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '[savedObjects]: savedObjects degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    const available: ServiceStatus<any> = {
      level: ServiceStatusLevels.available,
      summary: 'Available',
    };
    const degraded: ServiceStatus<any> = {
      level: ServiceStatusLevels.degraded,
      summary: 'This is degraded!',
    };

    it('updates when a new plugin status observable is set', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
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
        { a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' } },
        { a: { level: ServiceStatusLevels.degraded, summary: 'a degraded' } },
        { a: { level: ServiceStatusLevels.unavailable, summary: 'a unavailable' } },
        { a: { level: ServiceStatusLevels.available, summary: 'a available' } },
      ]);
    });

    it('debounces updates in a dependency tree between ticks', async () => {
      const service = new PluginsStatusService({ core$: coreAllAvailable$, pluginDependencies });
      const pluginA$ = new BehaviorSubject(available);
      service.set('a', pluginA$);

      const statusUpdates: Array<Record<PluginName, ServiceStatus>> = [];
      const subscription = service
        .getAll$()
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));
      const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

      await nextTick();
      pluginA$.next(degraded);
      await nextTick();
      subscription.unsubscribe();

      // Results should only include the final computed state of the depenency tree, once per tick.
      // As updates propagate between dependencies, they will not emit any updates until the microtasks queue has
      // been exhausted before the next tick.
      expect(statusUpdates).toEqual([
        {
          a: { level: ServiceStatusLevels.available, summary: 'Available' },
          b: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
          c: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
        },
        {
          a: { level: ServiceStatusLevels.degraded, summary: 'This is degraded!' },
          b: {
            level: ServiceStatusLevels.degraded,
            summary: '[a]: This is degraded!',
            detail: 'See the status page for more information',
            meta: expect.any(Object),
          },
          c: {
            level: ServiceStatusLevels.degraded,
            summary: '[2] services are degraded',
            detail: 'See the status page for more information',
            meta: expect.any(Object),
          },
        },
      ]);
    });
  });

  describe('getPlugins$', () => {
    it('only includes dependencies of specified plugin', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await service.getPlugins$('a').pipe(first()).toPromise()).toEqual({});
      expect(await service.getPlugins$('b').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });
      expect(await service.getPlugins$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
        b: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a status' }));

      expect(await service.getPlugins$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a status' }, // a is available depsite savedObjects being degraded
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '[savedObjects]: savedObjects degraded',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    it('throws error if unknown plugin passed', () => {
      const service = new PluginsStatusService({ core$: coreAllAvailable$, pluginDependencies });
      expect(() => {
        service.getPlugins$('dont-exist');
      }).toThrowError();
    });
  });
});
