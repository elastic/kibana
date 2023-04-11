/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of, BehaviorSubject } from 'rxjs';

import { ServiceStatus, ServiceStatusLevels, CoreStatus } from './types';
import { StatusService } from './status_service';
import { first } from 'rxjs/operators';
import { mockCoreContext } from '../core_context.mock';
import { ServiceStatusLevelSnapshotSerializer } from './test_utils';
import { environmentServiceMock } from '../environment/environment_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { mockRouter, RouterMock } from '../http/router/router.mock';
import { metricsServiceMock } from '../metrics/metrics_service.mock';
import { configServiceMock } from '../config/mocks';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

describe('StatusService', () => {
  let service: StatusService;

  beforeEach(() => {
    service = new StatusService(mockCoreContext.create());
  });

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const available: ServiceStatus<any> = {
    level: ServiceStatusLevels.available,
    summary: 'Available',
  };
  const degraded: ServiceStatus<any> = {
    level: ServiceStatusLevels.degraded,
    summary: 'This is degraded!',
  };
  const critical: ServiceStatus<any> = {
    level: ServiceStatusLevels.critical,
    summary: 'This is critical!',
  };

  type SetupDeps = Parameters<StatusService['setup']>[0];
  const setupDeps = (overrides: Partial<SetupDeps>): SetupDeps => {
    return {
      elasticsearch: {
        status$: of(available),
      },
      savedObjects: {
        status$: of(available),
      },
      pluginDependencies: new Map(),
      environment: environmentServiceMock.createSetupContract(),
      http: httpServiceMock.createInternalSetupContract(),
      metrics: metricsServiceMock.createInternalSetupContract(),
      ...overrides,
    };
  };

  describe('setup', () => {
    describe('core$', () => {
      it('rolls up core status observables into single observable', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(available),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );
        expect(await setup.core$.pipe(first()).toPromise()).toEqual({
          elasticsearch: available,
          savedObjects: degraded,
        });
      });

      it('replays last event', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(available),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );
        const subResult1 = await setup.core$.pipe(first()).toPromise();
        const subResult2 = await setup.core$.pipe(first()).toPromise();
        const subResult3 = await setup.core$.pipe(first()).toPromise();
        expect(subResult1).toEqual({
          elasticsearch: available,
          savedObjects: degraded,
        });
        expect(subResult2).toEqual({
          elasticsearch: available,
          savedObjects: degraded,
        });
        expect(subResult3).toEqual({
          elasticsearch: available,
          savedObjects: degraded,
        });
      });

      it('does not emit duplicate events', async () => {
        const elasticsearch$ = new BehaviorSubject(available);
        const savedObjects$ = new BehaviorSubject(degraded);
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: elasticsearch$,
            },
            savedObjects: {
              status$: savedObjects$,
            },
          })
        );

        const statusUpdates: CoreStatus[] = [];
        const subscription = setup.core$.subscribe((status) => statusUpdates.push(status));

        elasticsearch$.next(available);
        elasticsearch$.next(available);
        elasticsearch$.next({
          level: ServiceStatusLevels.available,
          summary: `Wow another summary`,
        });
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(available);
        subscription.unsubscribe();

        expect(statusUpdates).toMatchInlineSnapshot(`
          Array [
            Object {
              "elasticsearch": Object {
                "level": available,
                "summary": "Available",
              },
              "savedObjects": Object {
                "level": degraded,
                "summary": "This is degraded!",
              },
            },
            Object {
              "elasticsearch": Object {
                "level": available,
                "summary": "Wow another summary",
              },
              "savedObjects": Object {
                "level": degraded,
                "summary": "This is degraded!",
              },
            },
            Object {
              "elasticsearch": Object {
                "level": available,
                "summary": "Wow another summary",
              },
              "savedObjects": Object {
                "level": available,
                "summary": "Available",
              },
            },
          ]
        `);
      });
    });

    describe('overall$', () => {
      it('exposes an overall summary', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(degraded),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );
        expect(await setup.overall$.pipe(first()).toPromise()).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
      });

      it('replays last event', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(degraded),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );
        const subResult1 = await setup.overall$.pipe(first()).toPromise();
        const subResult2 = await setup.overall$.pipe(first()).toPromise();
        const subResult3 = await setup.overall$.pipe(first()).toPromise();
        expect(subResult1).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
        expect(subResult2).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
        expect(subResult3).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
      });

      it('does not emit duplicate events', async () => {
        const elasticsearch$ = new BehaviorSubject(available);
        const savedObjects$ = new BehaviorSubject(degraded);
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: elasticsearch$,
            },
            savedObjects: {
              status$: savedObjects$,
            },
          })
        );

        const statusUpdates: ServiceStatus[] = [];
        const subscription = setup.overall$.subscribe((status) => statusUpdates.push(status));

        // Wait for timers to ensure that duplicate events are still filtered out regardless of debouncing.
        elasticsearch$.next(available);
        await delay(100);
        elasticsearch$.next(available);
        await delay(100);
        elasticsearch$.next({
          level: ServiceStatusLevels.available,
          summary: `Wow another summary`,
        });
        await delay(100);
        savedObjects$.next(degraded);
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        subscription.unsubscribe();

        expect(statusUpdates).toMatchInlineSnapshot(`
          Array [
            Object {
              "detail": "See the status page for more information",
              "level": degraded,
              "meta": Object {
                "affectedServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service is degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });

      it('debounces events in quick succession', async () => {
        const savedObjects$ = new BehaviorSubject(available);
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: new BehaviorSubject(available),
            },
            savedObjects: {
              status$: savedObjects$,
            },
          })
        );

        const statusUpdates: ServiceStatus[] = [];
        const subscription = setup.overall$.subscribe((status) => statusUpdates.push(status));

        // All of these should debounced into a single `available` status
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        // Waiting for the debounce timeout should cut a new update
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        subscription.unsubscribe();

        expect(statusUpdates).toMatchInlineSnapshot(`
          Array [
            Object {
              "detail": "See the status page for more information",
              "level": degraded,
              "meta": Object {
                "affectedServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service is degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });
    });

    describe('coreOverall$', () => {
      it('exposes an overall summary of core services', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(degraded),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );
        expect(await setup.coreOverall$.pipe(first()).toPromise()).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
      });

      it('computes the summary depending on the services status', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(degraded),
            },
            savedObjects: {
              status$: of(critical),
            },
          })
        );
        expect(await setup.coreOverall$.pipe(first()).toPromise()).toMatchObject({
          level: ServiceStatusLevels.critical,
          summary: '1 service is critical: savedObjects',
        });
      });

      it('replays last event', async () => {
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: of(degraded),
            },
            savedObjects: {
              status$: of(degraded),
            },
          })
        );

        const subResult1 = await setup.coreOverall$.pipe(first()).toPromise();
        const subResult2 = await setup.coreOverall$.pipe(first()).toPromise();
        const subResult3 = await setup.coreOverall$.pipe(first()).toPromise();

        expect(subResult1).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
        expect(subResult2).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
        expect(subResult3).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 services are degraded: elasticsearch, savedObjects',
        });
      });

      it('does not emit duplicate events', async () => {
        const elasticsearch$ = new BehaviorSubject(available);
        const savedObjects$ = new BehaviorSubject(degraded);
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: elasticsearch$,
            },
            savedObjects: {
              status$: savedObjects$,
            },
          })
        );

        const statusUpdates: ServiceStatus[] = [];
        const subscription = setup.coreOverall$.subscribe((status) => statusUpdates.push(status));

        // Wait for timers to ensure that duplicate events are still filtered out regardless of debouncing.
        elasticsearch$.next(available);
        await delay(100);
        elasticsearch$.next(available);
        await delay(100);
        elasticsearch$.next({
          level: ServiceStatusLevels.available,
          summary: `Wow another summary`,
        });
        await delay(100);
        savedObjects$.next(degraded);
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        subscription.unsubscribe();

        expect(statusUpdates).toMatchInlineSnapshot(`
          Array [
            Object {
              "detail": "See the status page for more information",
              "level": degraded,
              "meta": Object {
                "affectedServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service is degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });

      it('debounces events in quick succession', async () => {
        const savedObjects$ = new BehaviorSubject(available);
        const setup = await service.setup(
          setupDeps({
            elasticsearch: {
              status$: new BehaviorSubject(available),
            },
            savedObjects: {
              status$: savedObjects$,
            },
          })
        );

        const statusUpdates: ServiceStatus[] = [];
        const subscription = setup.coreOverall$.subscribe((status) => statusUpdates.push(status));

        // All of these should debounced into a single `available` status
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        savedObjects$.next(available);
        savedObjects$.next(degraded);
        // Waiting for the debounce timeout should cut a new update
        await delay(100);
        savedObjects$.next(available);
        await delay(100);
        subscription.unsubscribe();

        expect(statusUpdates).toMatchInlineSnapshot(`
          Array [
            Object {
              "detail": "See the status page for more information",
              "level": degraded,
              "meta": Object {
                "affectedServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service is degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });
    });

    describe('preboot status routes', () => {
      let prebootRouterMock: RouterMock;
      beforeEach(async () => {
        prebootRouterMock = mockRouter.create();
      });

      it('does not register `status` route if anonymous access is not allowed', async () => {
        const httpSetup = httpServiceMock.createInternalSetupContract();
        httpSetup.registerPrebootRoutes.mockImplementation((path, callback) =>
          callback(prebootRouterMock)
        );
        await service.setup(setupDeps({ http: httpSetup }));

        expect(prebootRouterMock.get).not.toHaveBeenCalled();
      });

      it('registers `status` route if anonymous access is allowed', async () => {
        const configService = configServiceMock.create();
        configService.atPath.mockReturnValue(new BehaviorSubject({ allowAnonymous: true }));
        service = new StatusService(mockCoreContext.create({ configService }));

        const httpSetup = httpServiceMock.createInternalSetupContract();
        httpSetup.registerPrebootRoutes.mockImplementation((path, callback) =>
          callback(prebootRouterMock)
        );
        await service.setup(setupDeps({ http: httpSetup }));

        expect(prebootRouterMock.get).toHaveBeenCalledTimes(1);
        expect(prebootRouterMock.get).toHaveBeenCalledWith(
          {
            path: '/api/status',
            options: { authRequired: false, tags: ['api'] },
            validate: expect.anything(),
          },
          expect.any(Function)
        );
      });
    });
  });
});
