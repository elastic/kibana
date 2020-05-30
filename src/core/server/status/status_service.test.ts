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

import { of, BehaviorSubject } from 'rxjs';

import { ServiceStatus, ServiceStatusLevels, CoreStatus } from './types';
import { StatusService } from './status_service';
import { first } from 'rxjs/operators';
import { mockCoreContext } from '../core_context.mock';
import { ServiceStatusLevelSnapshotSerializer } from './test_utils';

expect.addSnapshotSerializer(ServiceStatusLevelSnapshotSerializer);

describe('StatusService', () => {
  const available: ServiceStatus<any> = {
    level: ServiceStatusLevels.available,
    summary: 'Available',
  };
  const degraded: ServiceStatus<any> = {
    level: ServiceStatusLevels.degraded,
    summary: 'This is degraded!',
  };

  describe('setup', () => {
    describe('core$', () => {
      it('rolls up core status observables into single observable', async () => {
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: of(available),
          },
          savedObjects: {
            status$: of(degraded),
          },
        });
        expect(await setup.core$.pipe(first()).toPromise()).toEqual({
          elasticsearch: available,
          savedObjects: degraded,
        });
      });

      it('replays last event', async () => {
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: of(available),
          },
          savedObjects: {
            status$: of(degraded),
          },
        });
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

      it('does not emit duplicate events', () => {
        const elasticsearch$ = new BehaviorSubject(available);
        const savedObjects$ = new BehaviorSubject(degraded);
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: elasticsearch$,
          },
          savedObjects: {
            status$: savedObjects$,
          },
        });

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
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: of(degraded),
          },
          savedObjects: {
            status$: of(degraded),
          },
        });
        expect(await setup.overall$.pipe(first()).toPromise()).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
        });
      });

      it('replays last event', async () => {
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: of(degraded),
          },
          savedObjects: {
            status$: of(degraded),
          },
        });
        const subResult1 = await setup.overall$.pipe(first()).toPromise();
        const subResult2 = await setup.overall$.pipe(first()).toPromise();
        const subResult3 = await setup.overall$.pipe(first()).toPromise();
        expect(subResult1).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
        });
        expect(subResult2).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
        });
        expect(subResult3).toMatchObject({
          level: ServiceStatusLevels.degraded,
          summary: '[2] services are degraded',
        });
      });

      it('does not emit duplicate events', () => {
        const elasticsearch$ = new BehaviorSubject(available);
        const savedObjects$ = new BehaviorSubject(degraded);
        const setup = new StatusService(mockCoreContext.create()).setup({
          elasticsearch: {
            status$: elasticsearch$,
          },
          savedObjects: {
            status$: savedObjects$,
          },
        });

        const statusUpdates: ServiceStatus[] = [];
        const subscription = setup.overall$.subscribe((status) => statusUpdates.push(status));

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
              "level": degraded,
              "summary": "[savedObjects]: This is degraded!",
            },
            Object {
              "level": available,
              "summary": "All services are available",
            },
          ]
        `);
      });
    });
  });
});
