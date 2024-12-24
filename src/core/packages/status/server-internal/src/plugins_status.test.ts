/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import { PluginsStatusService } from './plugins_status';
import { of, Observable, BehaviorSubject, ReplaySubject, firstValueFrom } from 'rxjs';
import { ServiceStatusLevels, CoreStatus, ServiceStatus } from '@kbn/core-status-common';
import { first, skip } from 'rxjs';
import { ServiceStatusLevelSnapshotSerializer } from './test_helpers';

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

  describe('set', () => {
    it('throws an exception if called after registrations are blocked', () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });

      service.start();
      expect(() => {
        service.set(
          'a',
          of({
            level: ServiceStatusLevels.available,
            summary: 'fail!',
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Custom statuses cannot be registered after setup, plugin [a] attempted"`
      );
    });
  });

  describe('getDerivedStatus$', () => {
    it(`defaults to core's most severe status`, async () => {
      const serviceAvailable = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await serviceAvailable.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.available,
        summary: 'All services are available',
      });

      const serviceDegraded = new PluginsStatusService({
        core$: coreOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceDegraded.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });

      const serviceCritical = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceCritical.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.critical,
        summary: '1 service(s) and 0 plugin(s) are critical: elasticsearch',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`provides a summary status when core and dependencies are at same severity level`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a is degraded' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '1 service(s) and 1 plugin(s) are degraded: savedObjects, a',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`allows dependencies status to take precedence over lower severity core statuses`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a is not working' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '0 service(s) and 1 plugin(s) are unavailable: a',
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
        summary: '1 service(s) and 0 plugin(s) are critical: elasticsearch',
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
        summary: '0 service(s) and 1 plugin(s) are unavailable: b',
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
        a: { level: ServiceStatusLevels.available, summary: 'All services are available' },
        b: { level: ServiceStatusLevels.available, summary: 'All services are available' },
        c: { level: ServiceStatusLevels.available, summary: 'All services are available' },
      });

      const serviceDegraded = new PluginsStatusService({
        core$: coreOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceDegraded.getAll$().pipe(first()).toPromise()).toEqual({
        a: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
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
          summary: '1 service(s) and 0 plugin(s) are critical: elasticsearch',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.critical,
          summary: '1 service(s) and 0 plugin(s) are critical: elasticsearch',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.critical,
          summary: '1 service(s) and 0 plugin(s) are critical: elasticsearch',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a status' }));

      expect(await service.getAll$().pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a status', reported: true }, // a is available despite savedObjects being degraded
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    it('updates when a new plugin status observable is set', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies: new Map([['a', []]]),
      });
      const statusUpdates: Array<Record<PluginName, ServiceStatus>> = [];
      const subscription = service
        .getAll$()
        // If we subscribe to the $getAll() Observable BEFORE setting a custom status Observable
        // for a given plugin ('a' in this test), then the first emission will happen
        // right after core$ services Observable emits
        .pipe(skip(1))
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));

      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a degraded' }));
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a unavailable' }));
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a available' }));
      subscription.unsubscribe();

      expect(statusUpdates).toEqual([
        {
          a: { level: ServiceStatusLevels.degraded, summary: 'a degraded', reported: true },
        },
        {
          a: {
            level: ServiceStatusLevels.unavailable,
            summary: 'a unavailable',
            reported: true,
          },
        },
        {
          a: {
            level: ServiceStatusLevels.available,
            summary: 'a available',
            reported: true,
          },
        },
      ]);
    });

    it('updates when a plugin status observable emits', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies: new Map([['a', []]]),
      });
      const statusUpdates: Array<Record<PluginName, ServiceStatus>> = [];
      const subscription = service
        .getAll$()
        // the first emission happens right after core services emit (see explanation above)
        .pipe(skip(1))
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));

      const aStatus$ = new BehaviorSubject<ServiceStatus>({
        level: ServiceStatusLevels.degraded,
        summary: 'a degraded',
      });
      service.set('a', aStatus$);
      aStatus$.next({ level: ServiceStatusLevels.unavailable, summary: 'a unavailable' });
      aStatus$.next({ level: ServiceStatusLevels.available, summary: 'a available' });
      subscription.unsubscribe();

      expect(statusUpdates).toEqual([
        {
          a: { level: ServiceStatusLevels.degraded, summary: 'a degraded', reported: true },
        },
        {
          a: {
            level: ServiceStatusLevels.unavailable,
            summary: 'a unavailable',
            reported: true,
          },
        },
        {
          a: {
            level: ServiceStatusLevels.available,
            summary: 'a available',
            reported: true,
          },
        },
      ]);
    });

    it('updates when a plugin status observable emits with the same level but a different summary', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies: new Map([['a', []]]),
      });
      const statusUpdates: Array<Record<PluginName, ServiceStatus>> = [];
      const subscription = service
        .getAll$()
        // the first emission happens right after core services emit (see explanation above)
        .pipe(skip(1))
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));

      const aStatus$ = new BehaviorSubject<ServiceStatus>({
        level: ServiceStatusLevels.available,
        summary: 'summary initial',
      });
      service.set('a', aStatus$);
      aStatus$.next({ level: ServiceStatusLevels.available, summary: 'summary updated' });
      subscription.unsubscribe();

      expect(statusUpdates).toEqual([
        {
          a: {
            level: ServiceStatusLevels.available,
            summary: 'summary initial',
            reported: true,
          },
        },
        {
          a: {
            level: ServiceStatusLevels.available,
            summary: 'summary updated',
            reported: true,
          },
        },
      ]);
    });

    it('emits an unavailable status if first emission times out, then continues future emissions', async () => {
      const service = new PluginsStatusService(
        {
          core$: coreAllAvailable$,
          pluginDependencies: new Map([
            ['a', []],
            ['b', ['a']],
          ]),
        },
        10 // set a small timeout so that the registered status Observable for 'a' times out quickly
      );

      const pluginA$ = new ReplaySubject<ServiceStatus>(1);
      service.set('a', pluginA$);
      service.start(); // the plugin emission timeout starts counting when we call pluginsStatus.start()

      // the first emission happens right after core$ services emit
      const firstEmission = firstValueFrom(service.getAll$().pipe(skip(1)));

      expect(await firstEmission).toEqual({
        a: {
          level: ServiceStatusLevels.unavailable,
          summary: 'Status check timed out after 10ms',
          reported: true,
        },
        b: {
          level: ServiceStatusLevels.unavailable,
          summary: '0 service(s) and 1 plugin(s) are unavailable: a',
          detail: 'See the status page for more information',
          meta: {
            affectedPlugins: [],
            failingServices: [],
            failingPlugins: ['a'],
          },
        },
      });
    });
  });

  describe('getDependenciesStatus$', () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it('only includes dependencies of specified plugin', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await service.getDependenciesStatus$('a').pipe(first()).toPromise()).toEqual({});
      expect(await service.getDependenciesStatus$('b').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All services are available' },
      });
      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All services are available' },
        b: { level: ServiceStatusLevels.available, summary: 'All services are available' },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a status' }));

      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a status', reported: true }, // a is available depsite savedObjects being degraded
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service(s) and 0 plugin(s) are degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
      });
    });

    it('throws error if unknown plugin passed', () => {
      const service = new PluginsStatusService({ core$: coreAllAvailable$, pluginDependencies });
      expect(() => {
        service.getDependenciesStatus$('dont-exist');
      }).toThrowError();
    });

    it('debounces plugins custom status registration', async () => {
      const service = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      const available: ServiceStatus = {
        level: ServiceStatusLevels.available,
        summary: 'a available',
      };

      const statusUpdates: Array<Record<string, ServiceStatus>> = [];
      const subscription = service
        .getDependenciesStatus$('b')
        .subscribe((status) => statusUpdates.push(status));

      const pluginA$ = new BehaviorSubject(available);
      service.set('a', pluginA$);

      expect(statusUpdates).toStrictEqual([]);

      // Waiting for the debounce timeout should cut a new update
      await delay(25);
      subscription.unsubscribe();

      expect(statusUpdates).toStrictEqual([{ a: { ...available, reported: true } }]);
    });

    it('debounces events in quick succession', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
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

      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      pluginA$.next(available);
      pluginA$.next(degraded);
      // Waiting for the debounce timeout should cut a new update
      await delay(25);
      pluginA$.next(available);
      await delay(25);
      subscription.unsubscribe();

      expect(statusUpdates).toMatchInlineSnapshot(`
        Array [
          Object {
            "a": Object {
              "level": degraded,
              "reported": true,
              "summary": "a degraded",
            },
          },
          Object {
            "a": Object {
              "level": available,
              "reported": true,
              "summary": "a available",
            },
          },
        ]
      `);
    });
  });
});
