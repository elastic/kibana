/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject, take } from 'rxjs';
import { getSampleDashboardState } from '../mocks';
import type { DashboardState } from '../../common';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';

describe('initializeUnifiedSearchManager', () => {
  describe('startComparing$', () => {
    test('Should return no changes when there are no changes', (done) => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
      const unifiedSearchManager = initializeUnifiedSearchManager(
        lastSavedState$.value,
        new BehaviorSubject<ControlGroupApi | undefined>(undefined),
        new BehaviorSubject<boolean>(false),
        new Subject<void>(),
        () => lastSavedState$.value,
        {
          useUnifiedSearchIntegration: false,
        }
      );
      unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
        expect(changes).toMatchInlineSnapshot(`Object {}`);
        done();
      });
    });

    describe('timeRange', () => {
      test('Should not return timeRanage change when timeRestore is false', (done) => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(false),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );
        unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
          expect(changes).toMatchInlineSnapshot(`Object {}`);
          done();
        });

        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });
      });

      test('Should return timeRanage change when timeRestore is true', (done) => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(true),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );
        unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
          expect(changes).toMatchInlineSnapshot(`
            Object {
              "timeRange": Object {
                "from": "now-30m",
                "to": "now",
              },
            }
          `);
          done();
        });

        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });
      });

      test('Should not return timeRanage change when timeRestore resets to false', (done) => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const timeRestore$ = new BehaviorSubject<boolean>(false);
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          timeRestore$,
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );
        let emitCount = 0;
        unifiedSearchManager.internalApi
          .startComparing$(lastSavedState$)
          .pipe(take(2))
          .subscribe((changes) => {
            emitCount++;

            if (emitCount === 1) {
              expect(changes).toMatchInlineSnapshot(`
              Object {
                "timeRange": Object {
                  "from": "now-30m",
                  "to": "now",
                },
              }
            `);
              // reset timeRestore to false
              timeRestore$.next(false);
            }

            if (emitCount === 2) {
              expect(changes).toMatchInlineSnapshot(`Object {}`);
              done();
            }
          });

        timeRestore$.next(true);
        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });
      });
    });

    describe('projectRouting', () => {
      test('Should update projectRouting via setProjectRouting', () => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(false),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );

        // initializes with undefined projectRouting by default
        expect(unifiedSearchManager.api.projectRouting$.value).toBeUndefined();

        unifiedSearchManager.api.setProjectRouting('_alias:_origin');
        expect(unifiedSearchManager.api.projectRouting$.value).toBe('_alias:_origin');

        unifiedSearchManager.api.setProjectRouting(undefined);
        expect(unifiedSearchManager.api.projectRouting$.value).toBeUndefined();
      });

      test('Should detect projectRouting change from _alias:_origin to undefined', (done) => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>({
          ...getSampleDashboardState(),
          projectRouting: '_alias:_origin',
        });
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(false),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );

        // initializes with _alias:_origin projectRouting if set in last saved state
        expect(unifiedSearchManager.api.projectRouting$.value).toBe('_alias:_origin');

        unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
          expect(changes).toMatchInlineSnapshot(`
            Object {
              "projectRouting": undefined,
            }
          `);
          done();
        });

        unifiedSearchManager.api.setProjectRouting(undefined);
      });

      test('Should not detect changes when projectRouting stays undefined', (done) => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(false),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );

        unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
          expect(changes).toMatchInlineSnapshot(`Object {}`);
          done();
        });

        // Setting to undefined when it's already undefined should not trigger change
        unifiedSearchManager.api.setProjectRouting(undefined);
      });

      test('Should restore projectRouting in reset', () => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>({
          ...getSampleDashboardState(),
          projectRouting: '_alias:_origin',
        });
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean>(false),
          new Subject<void>(),
          () => lastSavedState$.value,
          {
            useUnifiedSearchIntegration: false,
          }
        );

        // Change projectRouting
        unifiedSearchManager.api.setProjectRouting(undefined);
        expect(unifiedSearchManager.api.projectRouting$.value).toBeUndefined();

        // Reset to last saved state
        unifiedSearchManager.internalApi.reset(lastSavedState$.value);
        expect(unifiedSearchManager.api.projectRouting$.value).toBe('_alias:_origin');
      });
    });
  });
});
