/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { getSampleDashboardState } from '../mocks';
import type { DashboardState } from '../../common';
import { COMPARE_DEBOUNCE, initializeUnifiedSearchManager } from './unified_search_manager';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';

describe('initializeUnifiedSearchManager', () => {
  describe('startComparing$', () => {
    test('Should return no changes when there are no changes', (done) => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
      const unifiedSearchManager = initializeUnifiedSearchManager(
        lastSavedState$.value,
        new BehaviorSubject<ControlGroupApi | undefined>(undefined),
        new BehaviorSubject<boolean | undefined>(false),
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
          new BehaviorSubject<boolean | undefined>(false),
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
        const lastSavedState$ = new BehaviorSubject<DashboardState>({
          ...getSampleDashboardState(),
          timeRestore: true,
        });
        const unifiedSearchManager = initializeUnifiedSearchManager(
          lastSavedState$.value,
          new BehaviorSubject<ControlGroupApi | undefined>(undefined),
          new BehaviorSubject<boolean | undefined>(true),
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

      test('Should not return timeRanage change when timeRestore resets to false', async () => {
        const lastSavedState$ = new BehaviorSubject<DashboardState>(getSampleDashboardState());
        const timeRestore$ = new BehaviorSubject<boolean | undefined>(false);
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
        let unsavedChanges: object | undefined;
        unifiedSearchManager.internalApi.startComparing$(lastSavedState$).subscribe((changes) => {
          unsavedChanges = changes;
        });

        timeRestore$.next(true);
        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });

        await new Promise((resolve) => setTimeout(resolve, COMPARE_DEBOUNCE + 1));

        expect(unsavedChanges).toMatchInlineSnapshot(`
            Object {
              "timeRange": Object {
                "from": "now-30m",
                "to": "now",
              },
            }
          `);

        // reset timeRestore to false
        timeRestore$.next(false);

        await new Promise((resolve) => setTimeout(resolve, COMPARE_DEBOUNCE + 1));

        expect(unsavedChanges).toMatchInlineSnapshot(`Object {}`);
      });
    });
  });
});
