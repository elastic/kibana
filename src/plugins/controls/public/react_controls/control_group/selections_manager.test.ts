/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { BehaviorSubject, skip } from 'rxjs';
import { initSelectionsManager } from './selections_manager';
import { ControlGroupApi } from './types';

describe('selections manager', () => {
  const control1Api = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  };
  const control2Api = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  };
  const control3Api = {
    timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
  };
  const children$ = new BehaviorSubject<{
    [key: string]: {
      filters$?: BehaviorSubject<Filter[] | undefined>;
      timeslice$?: BehaviorSubject<[number, number] | undefined>;
    };
  }>({});
  const controlGroupApi = {
    autoApplySelections$: new BehaviorSubject(false),
    children$,
    untilInitialized: async () => {
      control1Api.filters$.next(undefined);
      control2Api.filters$.next([
        {
          meta: {
            alias: 'control2 original filter',
          },
        },
      ]);
      control3Api.timeslice$.next([
        Date.parse('2024-06-09T06:00:00.000Z'),
        Date.parse('2024-06-09T12:00:00.000Z'),
      ]);
      controlGroupApi.children$.next({
        control1: control1Api,
        control2: control2Api,
        control3: control3Api,
      });
    },
  };

  const onFireMock = jest.fn();
  beforeEach(() => {
    onFireMock.mockReset();
    controlGroupApi.children$.next({});
  });

  describe('auto apply selections disabled', () => {
    beforeEach(() => {
      controlGroupApi.autoApplySelections$.next(false);
    });

    test('should publish initial filters and initial timeslice', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(selectionsManager.api.filters$.value).toEqual([
        {
          meta: {
            alias: 'control2 original filter',
          },
        },
      ]);
      expect(new Date(selectionsManager.api.timeslice$.value![0]).toISOString()).toEqual(
        '2024-06-09T06:00:00.000Z'
      );
      expect(new Date(selectionsManager.api.timeslice$.value![1]).toISOString()).toEqual(
        '2024-06-09T12:00:00.000Z'
      );
      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
    });

    test('should not publish filter changes until applySelections is called', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const subscription = selectionsManager.api.filters$.pipe(skip(1)).subscribe(onFireMock);

      // remove filter to trigger changes
      control2Api.filters$.next(undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(true);
      expect(onFireMock).toHaveBeenCalledTimes(0);

      selectionsManager.applySelections();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
      expect(onFireMock).toHaveBeenCalledTimes(1);
      const filters = onFireMock.mock.calls[0][0];
      expect(filters).toEqual([]);

      subscription.unsubscribe();
    });

    test('should not publish timeslice changes until applySelections is called', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const subscription = selectionsManager.api.timeslice$.pipe(skip(1)).subscribe(onFireMock);

      // remove timeslice to trigger changes
      control3Api.timeslice$.next(undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(true);
      expect(onFireMock).toHaveBeenCalledTimes(0);

      selectionsManager.applySelections();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
      expect(onFireMock).toHaveBeenCalledTimes(1);
      const timeslice = onFireMock.mock.calls[0][0];
      expect(timeslice).toBeUndefined();

      subscription.unsubscribe();
    });
  });

  describe('auto apply selections enabled', () => {
    beforeEach(() => {
      controlGroupApi.autoApplySelections$.next(true);
    });

    test('should publish initial filters and initial timeslice', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(selectionsManager.api.filters$.value).toEqual([
        {
          meta: {
            alias: 'control2 original filter',
          },
        },
      ]);
      expect(new Date(selectionsManager.api.timeslice$.value![0]).toISOString()).toEqual(
        '2024-06-09T06:00:00.000Z'
      );
      expect(new Date(selectionsManager.api.timeslice$.value![1]).toISOString()).toEqual(
        '2024-06-09T12:00:00.000Z'
      );
      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
    });

    test('should publish filter changes', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const subscription = selectionsManager.api.filters$.pipe(skip(1)).subscribe(onFireMock);

      // remove filter to trigger changes
      control2Api.filters$.next(undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
      expect(onFireMock).toHaveBeenCalledTimes(1);
      const filters = onFireMock.mock.calls[0][0];
      expect(filters).toEqual([]);

      subscription.unsubscribe();
    });

    test('should publish timeslice changes', async () => {
      const selectionsManager = initSelectionsManager(
        controlGroupApi as unknown as Pick<
          ControlGroupApi,
          'autoApplySelections$' | 'children$' | 'untilInitialized'
        >
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      const subscription = selectionsManager.api.timeslice$.pipe(skip(1)).subscribe(onFireMock);

      // remove timeslice to trigger changes
      control3Api.timeslice$.next(undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(selectionsManager.hasUnappliedSelections$.value).toBe(false);
      expect(onFireMock).toHaveBeenCalledTimes(1);
      const timeslice = onFireMock.mock.calls[0][0];
      expect(timeslice).toBeUndefined();

      subscription.unsubscribe();
    });
  });
});
