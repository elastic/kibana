/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ControlGroupChainingSystem } from '@kbn/controls-plugin/common';
import { Filter } from '@kbn/es-query';
import { BehaviorSubject, skip } from 'rxjs';
import { chaining$ } from './chaining';

const FILTER_ALPHA = {
  meta: {
    alias: 'filterAlpha'
  }
};
const FILTER_BRAVO = {
  meta: {
    alias: 'filterBravo'
  }
};
const FILTER_CHARLIE = {
  meta: {
    alias: 'filterCharlie'
  }
};
const FILTER_DELTA = {
  meta: {
    alias: 'filterDelta'
  }
};

describe('chaining$', () => {
  const onFireMock = jest.fn();
  const chainingSystem$ = new BehaviorSubject<ControlGroupChainingSystem>('HIERARCHICAL');
  const controlsInOrder$ = new BehaviorSubject<Array<{ id: string }>>([]);
  const getControlApi = (uuid: string) => {
    if (uuid === 'alpha') {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>([FILTER_ALPHA])
      };
    } else if (uuid === 'bravo') {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>([FILTER_BRAVO]),
        timeslice$: new BehaviorSubject<[number, number] | undefined>([
          Date.parse('2024-06-09T06:00:00.000Z'), 
          Date.parse('2024-06-09T12:00:00.000Z')
        ])
      };
    } else if (uuid === 'charlie') {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>([FILTER_CHARLIE])
      };
    } else if (uuid === 'delta') {
      return {
        filters$: new BehaviorSubject<Filter[] | undefined>([FILTER_DELTA])
      };
    }
  }
  
  beforeEach(() => {
    onFireMock.mockReset();
    chainingSystem$.next('HIERARCHICAL');
    controlsInOrder$.next([
      { id: 'alpha' },
      { id: 'bravo' },
      { id: 'charlie' },
      { id: 'delta' },
    ]);
  });

  describe('hierarchical chaining', () => {
    test('should contain values from controls to the left', async () => {
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        getControlApi
      ).subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [
          FILTER_ALPHA,
          FILTER_BRAVO
        ],
        timeRange: {
          from: '2024-06-09T06:00:00.000Z',
          to: '2024-06-09T12:00:00.000Z',
          mode: 'absolute',
        },
      });
      subscription.unsubscribe();
    });

    test('should fire on chaining system change', async () => {
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        getControlApi
      ).pipe(skip(1)).subscribe(onFireMock);
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
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        getControlApi
      ).pipe(skip(1)).subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);
      
      // Move control to right of 'delta' control
      controlsInOrder$.next([
        { id: 'alpha' },
        { id: 'bravo' },
        { id: 'delta' },
        { id: 'charlie' },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [
          FILTER_ALPHA,
          FILTER_BRAVO,
          FILTER_DELTA,
        ],
        timeRange: {
          from: '2024-06-09T06:00:00.000Z',
          to: '2024-06-09T12:00:00.000Z',
          mode: 'absolute',
        },
      });
      subscription.unsubscribe();
    });

    test('should fire when controls are removed', async () => {
      const subscription = chaining$(
        'charlie',
        chainingSystem$,
        controlsInOrder$,
        getControlApi
      ).pipe(skip(1)).subscribe(onFireMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFireMock.mock.calls).toHaveLength(0);
      
      // remove 'bravo' control
      controlsInOrder$.next([
        { id: 'alpha' },
        { id: 'charlie' },
        { id: 'delta' },
      ]);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onFireMock.mock.calls).toHaveLength(1);
      const chainingContext = onFireMock.mock.calls[0][0];
      expect(chainingContext).toEqual({
        chainingFilters: [
          FILTER_ALPHA,
        ],
        timeRange: undefined,
      });
      subscription.unsubscribe();
    });
  });
});