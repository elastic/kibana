/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of, BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

import { type ServiceStatus, ServiceStatusLevels, type CoreStatus } from '@kbn/core-status-common';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import { first, take, toArray } from 'rxjs';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { environmentServiceMock } from '@kbn/core-environment-server-mocks';
import { mockRouter, RouterMock } from '@kbn/core-http-router-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { metricsServiceMock } from '@kbn/core-metrics-server-mocks';
import { configServiceMock } from '@kbn/config-mocks';
import { coreUsageDataServiceMock } from '@kbn/core-usage-data-server-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';

import {
  logCoreStatusChangesMock,
  logPluginsStatusChangesMock,
  logOverallStatusChangesMock,
} from './status_service.test.mocks';
import { StatusService, type StatusServiceSetupDeps } from './status_service';
import { ServiceStatusLevelSnapshotSerializer } from './test_helpers';
import type { InternalStatusServiceSetup } from './types';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

describe('StatusService', () => {
  let service: StatusService;
  let logger: jest.Mocked<ILoggingSystem>;

  beforeEach(() => {
    logger = loggingSystemMock.create();
    service = new StatusService(mockCoreContext.create({ logger }));
  });

  afterEach(() => {
    loggingSystemMock.clear(logger);
    logCoreStatusChangesMock.mockReset();
    logPluginsStatusChangesMock.mockReset();
    logOverallStatusChangesMock.mockReset();
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

  const setupDeps = (overrides: Partial<StatusServiceSetupDeps> = {}): StatusServiceSetupDeps => {
    return {
      analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
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
      coreUsageData: coreUsageDataServiceMock.createSetupContract(),
      ...overrides,
    };
  };

  describe('#preboot', () => {
    it('registers `status` route', async () => {
      const configService = configServiceMock.create();
      configService.atPath.mockReturnValue(new BehaviorSubject({ allowAnonymous: true }));
      service = new StatusService(mockCoreContext.create({ configService }));

      const prebootRouterMock: RouterMock = mockRouter.create();
      const httpPreboot = httpServiceMock.createInternalPrebootContract();
      httpPreboot.registerRoutes.mockImplementation((path, callback) =>
        callback(prebootRouterMock)
      );
      await service.preboot({ http: httpPreboot });

      expect(prebootRouterMock.get).toHaveBeenCalledTimes(1);
      expect(prebootRouterMock.get).toHaveBeenCalledWith(
        {
          path: '/api/status',
          options: {
            authRequired: false,
            tags: ['api'],
            access: 'public',
            excludeFromRateLimiter: true,
          },
          validate: false,
        },
        expect.any(Function)
      );
    });
  });

  describe('#setup', () => {
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
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
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
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
        });
        expect(subResult2).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
        });
        expect(subResult3).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
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
                "affectedPlugins": Array [],
                "failingPlugins": Array [],
                "failingServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service(s) and 0 plugin(s) are degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services and plugins are available",
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
                "affectedPlugins": Array [],
                "failingPlugins": Array [],
                "failingServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service(s) and 0 plugin(s) are degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services and plugins are available",
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
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
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
          summary: '1 service(s) and 0 plugin(s) are critical: savedObjects',
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
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
        });
        expect(subResult2).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
        });
        expect(subResult3).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '2 service(s) and 0 plugin(s) are degraded: elasticsearch, savedObjects',
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
                "affectedPlugins": Array [],
                "failingPlugins": Array [],
                "failingServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service(s) and 0 plugin(s) are degraded: savedObjects",
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
                "affectedPlugins": Array [],
                "failingPlugins": Array [],
                "failingServices": Array [
                  "savedObjects",
                ],
              },
              "summary": "1 service(s) and 0 plugin(s) are degraded: savedObjects",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });
    });

    describe('analytics', () => {
      let analyticsMock: jest.Mocked<AnalyticsServiceSetup>;
      let setup: InternalStatusServiceSetup;

      beforeEach(async () => {
        analyticsMock = analyticsServiceMock.createAnalyticsServiceSetup();
        setup = await service.setup(setupDeps({ analytics: analyticsMock }));
      });

      test('registers a context provider', async () => {
        expect(analyticsMock.registerContextProvider).toHaveBeenCalledTimes(1);
        const { context$ } = analyticsMock.registerContextProvider.mock.calls[0][0];
        await expect(firstValueFrom(context$.pipe(take(2), toArray()))).resolves
          .toMatchInlineSnapshot(`
          Array [
            Object {
              "overall_status_level": "initializing",
              "overall_status_summary": "Kibana is starting up",
            },
            Object {
              "overall_status_level": "available",
              "overall_status_summary": "All services and plugins are available",
            },
          ]
        `);
      });

      test('registers and reports an event', async () => {
        expect(analyticsMock.registerEventType).toHaveBeenCalledTimes(1);
        expect(analyticsMock.reportEvent).toHaveBeenCalledTimes(0);
        // wait for an emission of overall$
        await firstValueFrom(setup.overall$);
        expect(analyticsMock.reportEvent).toHaveBeenCalledTimes(1);
        expect(analyticsMock.reportEvent.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "core-overall_status_changed",
            Object {
              "overall_status_level": "available",
              "overall_status_summary": "All services and plugins are available",
            },
          ]
        `);
      });
    });
  });

  describe('#start', () => {
    it('calls logCoreStatusChangesMock with the right params', async () => {
      await service.setup(setupDeps());
      await service.start();

      expect(logCoreStatusChangesMock).toHaveBeenCalledTimes(1);
      expect(logCoreStatusChangesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.any(Object),
          core$: expect.any(Observable),
          stop$: expect.any(Observable),
        })
      );
    });

    it('calls logPluginsStatusChangesMock with the right params', async () => {
      await service.setup(setupDeps());
      await service.start();

      expect(logPluginsStatusChangesMock).toHaveBeenCalledTimes(1);
      expect(logPluginsStatusChangesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.any(Object),
          plugins$: expect.any(Observable),
          stop$: expect.any(Observable),
        })
      );
    });

    it('calls logOverallStatusChangesMock with the right params', async () => {
      await service.setup(setupDeps());
      await service.start();

      expect(logOverallStatusChangesMock).toHaveBeenCalledTimes(1);
      expect(logOverallStatusChangesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: expect.any(Object),
          overall$: expect.any(Observable),
          stop$: expect.any(Observable),
        })
      );
    });
  });
});
