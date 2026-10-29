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
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { diffUnifiedSearchState, initializeUnifiedSearchManager } from './unified_search_manager';

describe('initializeUnifiedSearchManager', () => {
  describe('diffUnifiedSearchState', () => {
    const initManager = (lastSavedState: DashboardState, timeRestore$: BehaviorSubject<boolean>) =>
      initializeUnifiedSearchManager(
        lastSavedState,
        timeRestore$,
        new Subject<void>(),
        () => lastSavedState,
        new Subject(),
        {
          useUnifiedSearchIntegration: false,
        }
      );

    const getChanges = (
      lastSavedState: DashboardState,
      unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>
    ) => {
      const currentState = unifiedSearchManager.internalApi.getState();
      return diffUnifiedSearchState(lastSavedState, currentState, Boolean(currentState.time_range));
    };

    test('Should return no changes when there are no changes', () => {
      const lastSavedState = getSampleDashboardState({
        filters: [
          {
            type: 'condition',
            condition: {
              field: 'status',
              operator: 'is',
              value: 'active',
            },
          },
        ],
      });
      const unifiedSearchManager = initManager(lastSavedState, new BehaviorSubject(false));
      expect(getChanges(lastSavedState, unifiedSearchManager)).toMatchInlineSnapshot(`Object {}`);
    });

    describe('timeRange', () => {
      test('Should not return timeRanage change when timeRestore is false', () => {
        const lastSavedState = getSampleDashboardState();
        const unifiedSearchManager = initManager(lastSavedState, new BehaviorSubject(false));

        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });

        expect(getChanges(lastSavedState, unifiedSearchManager)).toMatchInlineSnapshot(`Object {}`);
      });

      test('Should return timeRanage change when timeRestore is true', () => {
        const lastSavedState = getSampleDashboardState();
        const unifiedSearchManager = initManager(lastSavedState, new BehaviorSubject(true));

        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });

        expect(getChanges(lastSavedState, unifiedSearchManager)).toMatchInlineSnapshot(`
          Object {
            "time_range": Object {
              "from": "now-30m",
              "to": "now",
            },
          }
        `);
      });

      test('Should not return timeRanage change when timeRestore resets to false', () => {
        const lastSavedState = getSampleDashboardState();
        const timeRestore$ = new BehaviorSubject<boolean>(true);
        const unifiedSearchManager = initManager(lastSavedState, timeRestore$);

        unifiedSearchManager.api.setTimeRange({
          to: 'now',
          from: 'now-30m',
        });
        expect(getChanges(lastSavedState, unifiedSearchManager)).toMatchInlineSnapshot(`
          Object {
            "time_range": Object {
              "from": "now-30m",
              "to": "now",
            },
          }
        `);

        timeRestore$.next(false);
        expect(getChanges(lastSavedState, unifiedSearchManager)).toMatchInlineSnapshot(`Object {}`);
      });
    });
  });
  describe('getState', () => {
    test('Should return as code filters', () => {
      const lastSavedState$ = new BehaviorSubject<DashboardState>(
        getSampleDashboardState({
          filters: [
            {
              type: 'condition',
              condition: {
                field: 'status',
                operator: 'is',
                value: 'active',
              },
            },
          ],
        })
      );
      const unifiedSearchManager = initializeUnifiedSearchManager(
        lastSavedState$.value,
        new BehaviorSubject<boolean>(false),
        new Subject<void>(),
        () => lastSavedState$.value,
        new Subject(),
        {
          useUnifiedSearchIntegration: false,
        }
      );
      // change the unified search filter
      unifiedSearchManager.api.setFilters([
        {
          meta: {
            key: 'status',
            type: 'phrase',
          },
          query: {
            match_phrase: {
              status: 'inactive',
            },
          },
        },
      ]);
      expect(unifiedSearchManager.internalApi.getState().filters).toEqual([
        {
          type: 'condition',
          condition: {
            field: 'status',
            operator: 'is',
            value: 'inactive',
          },
        },
      ]);
    });
  });
});
