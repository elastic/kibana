/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip } from 'rxjs';

import { Filter } from '@kbn/es-query';

import { ControlGroupChainingSystem } from '../../../../common';
import { chaining$ } from './chaining';

const FILTER_ALPHA = {
  meta: {
    alias: 'filterAlpha',
  },
};
const FILTER_BRAVO = {
  meta: {
    alias: 'filterBravo',
  },
};
const FILTER_CHARLIE = {
  meta: {
    alias: 'filterCharlie',
  },
};
const FILTER_DELTA = {
  meta: {
    alias: 'filterDelta',
  },
};

describe('chaining$', () => {
  const onFireMock = jest.fn();
  const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>('HIERARCHICAL');
  const controlsInOrder$ = new BehaviorSubject<Array<{ id: string; type: string }>>([]);
  const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
  const alphaControlApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  };
  const bravoControlApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
    timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
  };
  const charlieControlApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  };
  const deltaControlApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>([FILTER_DELTA]),
  };

  beforeEach(() => {
    onFireMock.mockReset();
    alphaControlApi.filters$.next([FILTER_ALPHA]);
    bravoControlApi.filters$.next([FILTER_BRAVO]);
    bravoControlApi.timeslice$.next([
      Date.parse('2024-06-09T06:00:00.000Z'),
      Date.parse('2024-06-09T12:00:00.000Z'),
    ]);
    charlieControlApi.filters$.next([FILTER_CHARLIE]);
    deltaControlApi.filters$.next([FILTER_DELTA]);
    chainingSystem$.next('HIERARCHICAL');
    controlsInOrder$.next([
      { id: 'alpha', type: 'whatever' },
      { id: 'bravo', type: 'whatever' },
      { id: 'charlie', type: 'whatever' },
      { id: 'delta', type: 'whatever' },
    ]);
    children$.next({
      alpha: alphaControlApi,
      bravo: bravoControlApi,
      charlie: charlieControlApi,
      delta: deltaControlApi,
    });
  });

  describe('hierarchical chaining', () => {
    test('should not fire until all chained controls are initialized', async () => {
      const childrenValueWithNoControlsInitialized = {};
      children$.next(childrenValueWithNoControlsInitialized);
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        children$
      ).subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      const childrenValueWithAlphaInitialized = {
        alpha: alphaControlApi,
      };
      children$.next(childrenValueWithAlphaInitialized);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      const childrenValueWithAllControlsInitialized = {
        alpha: alphaControlApi,
        bravo: bravoControlApi,
      };
      children$.next(childrenValueWithAllControlsInitialized);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(1);

      subscription.unsubscribe();
    });

    test('should contain values from controls to the left', async () => {
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        children$
      ).subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [FILTER_ALPHA, FILTER_BRAVO],
        timeRange: {
          from: '2024-06-09T06:00:00.000Z',
          to: '2024-06-09T12:00:00.000Z',
          mode: 'absolute',
        },
      });
      subscription.unsubscribe();
    });

    test('should fire on chaining system change', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      chainingSystem$.next('NONE');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [],
        timeRange: undefined,
      });
      subscription.unsubscribe();
    });

    test('should fire when controls are moved', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      // Move control to right of 'delta' control
      controlsInOrder$.next([
        { id: 'alpha', type: 'whatever' },
        { id: 'bravo', type: 'whatever' },
        { id: 'delta', type: 'whatever' },
        { id: 'charlie', type: 'whatever' },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [FILTER_ALPHA, FILTER_BRAVO, FILTER_DELTA],
        timeRange: {
          from: '2024-06-09T06:00:00.000Z',
          to: '2024-06-09T12:00:00.000Z',
          mode: 'absolute',
        },
      });
      subscription.unsubscribe();
    });

    test('should fire when controls are removed', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      // remove 'bravo' control
      controlsInOrder$.next([
        { id: 'alpha', type: 'whatever' },
        { id: 'charlie', type: 'whatever' },
        { id: 'delta', type: 'whatever' },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [FILTER_ALPHA],
        timeRange: undefined,
      });
      subscription.unsubscribe();
    });

    test('should fire when chained filter changes', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      alphaControlApi.filters$.next([
        {
          meta: {
            alias: 'filterAlpha_version2',
          },
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext.chainingFilters).toEqual([
        {
          meta: {
            alias: 'filterAlpha_version2',
          },
        },
        FILTER_BRAVO,
      ]);
      subscription.unsubscribe();
    });

    test('should not fire when unchained filter changes', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      deltaControlApi.filters$.next([
        {
          meta: {
            alias: 'filterDelta_version2',
          },
        },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(0);
      subscription.unsubscribe();
    });

    test('should fire when chained timeslice changes', async () => {
      const subscription = chaining$('charlie', chainingSystem$, controlsInOrder$, children$)
        .pipe(skip(1))
        .subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);

      bravoControlApi.timeslice$.next([
        Date.parse('2024-06-09T12:00:00.000Z'),
        Date.parse('2024-06-09T18:00:00.000Z'),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext.timeRange).toEqual({
        from: '2024-06-09T12:00:00.000Z',
        to: '2024-06-09T18:00:00.000Z',
        mode: 'absolute',
      });
      subscription.unsubscribe();
    });
  });
});
