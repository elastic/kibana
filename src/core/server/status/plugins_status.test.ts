/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginName } from '../plugins';
import { PluginsStatusService } from './plugins_status';
import { of, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { ServiceStatusLevels, CoreStatus, ServiceStatus } from './types';
import { first } from 'rxjs/operators';
import { ServiceStatusLevelSnapshotSerializer } from './test_utils';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

// FIXME temporarily skipping these tests to asses performance of this solution for https://github.com/elastic/kibana/issues/128061
describe.skip('PluginStatusService', () => {
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

      service.blockNewRegistrations();
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
        summary: 'All dependencies are available',
      });

      const serviceDegraded = new PluginsStatusService({
        core$: coreOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceDegraded.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '1 service is degraded: savedObjects',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });

      const serviceCritical = new PluginsStatusService({
        core$: coreOneCriticalOneDegraded$,
        pluginDependencies,
      });
      expect(await serviceCritical.getDerivedStatus$('a').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.critical,
        summary: '1 service is critical: elasticsearch',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`provides a summary status when core and dependencies are at same severity level`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a is degraded' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.degraded,
        summary: '2 services are degraded: savedObjects, a',
        detail: 'See the status page for more information',
        meta: expect.any(Object),
      });
    });

    it(`allows dependencies status to take precedence over lower severity core statuses`, async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a is not working' }));
      expect(await service.getDerivedStatus$('b').pipe(first()).toPromise()).toEqual({
        level: ServiceStatusLevels.unavailable,
        summary: '1 service is unavailable: a',
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
        summary: '1 service is critical: elasticsearch',
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
        summary: '1 service is unavailable: b',
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
          summary: '1 service is degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service is degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service is degraded: savedObjects',
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
          summary: '1 service is critical: elasticsearch',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        b: {
          level: ServiceStatusLevels.critical,
          summary: '1 service is critical: elasticsearch',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.critical,
          summary: '1 service is critical: elasticsearch',
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
          summary: '1 service is degraded: savedObjects',
          detail: 'See the status page for more information',
          meta: expect.any(Object),
        },
        c: {
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: savedObjects, b',
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
        .subscribe((pluginStatuses) => statusUpdates.push(pluginStatuses));

      service.set('a', of({ level: ServiceStatusLevels.degraded, summary: 'a degraded' }));
      service.set('a', of({ level: ServiceStatusLevels.unavailable, summary: 'a unavailable' }));
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a available' }));
      subscription.unsubscribe();

      expect(statusUpdates).toEqual([
        { a: { level: ServiceStatusLevels.degraded, summary: 'a degraded' } },
        { a: { level: ServiceStatusLevels.unavailable, summary: 'a unavailable' } },
        { a: { level: ServiceStatusLevels.available, summary: 'a available' } },
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
        { a: { level: ServiceStatusLevels.degraded, summary: 'a degraded' } },
        { a: { level: ServiceStatusLevels.unavailable, summary: 'a unavailable' } },
        { a: { level: ServiceStatusLevels.available, summary: 'a available' } },
      ]);
    });

    it('emits an unavailable status if first emission times out, then continues future emissions', async () => {
      jest.useFakeTimers();
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies: new Map([
          ['a', []],
          ['b', ['a']],
        ]),
      });

      const pluginA$ = new ReplaySubject<ServiceStatus>(1);
      service.set('a', pluginA$);
      const firstEmission = service.getAll$().pipe(first()).toPromise();
      jest.runAllTimers();

      expect(await firstEmission).toEqual({
        a: { level: ServiceStatusLevels.unavailable, summary: 'Status check timed out after 30s' },
        b: {
          level: ServiceStatusLevels.unavailable,
          summary: '1 service is unavailable: a',
          detail: 'See the status page for more information',
          meta: {
            affectedServices: ['a'],
          },
        },
      });

      pluginA$.next({ level: ServiceStatusLevels.available, summary: 'a available' });
      const secondEmission = service.getAll$().pipe(first()).toPromise();
      jest.runAllTimers();
      expect(await secondEmission).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a available' },
        b: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });
      jest.useRealTimers();
    });
  });

  describe('getDependenciesStatus$', () => {
    it('only includes dependencies of specified plugin', async () => {
      const service = new PluginsStatusService({
        core$: coreAllAvailable$,
        pluginDependencies,
      });
      expect(await service.getDependenciesStatus$('a').pipe(first()).toPromise()).toEqual({});
      expect(await service.getDependenciesStatus$('b').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });
      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
        b: { level: ServiceStatusLevels.available, summary: 'All dependencies are available' },
      });
    });

    it('uses the manually set status level if plugin specifies one', async () => {
      const service = new PluginsStatusService({ core$: coreOneDegraded$, pluginDependencies });
      service.set('a', of({ level: ServiceStatusLevels.available, summary: 'a status' }));

      expect(await service.getDependenciesStatus$('c').pipe(first()).toPromise()).toEqual({
        a: { level: ServiceStatusLevels.available, summary: 'a status' }, // a is available depsite savedObjects being degraded
        b: {
          level: ServiceStatusLevels.degraded,
          summary: '1 service is degraded: savedObjects',
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
        core$: coreAllAvailable$,
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

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Waiting for the debounce timeout should cut a new update
      await delay(25);
      subscription.unsubscribe();

      expect(statusUpdates).toStrictEqual([{ a: available }]);
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
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
