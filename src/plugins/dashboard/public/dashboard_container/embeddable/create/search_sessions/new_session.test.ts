/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewFieldBase, DataViewBase, TimeRange, Filter } from '@kbn/es-query';
import { buildExistsFilter, disableFilter, pinFilter, toggleFilterNegated } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { newSession$ } from './new_session';

describe('newSession$', () => {
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const query$ = new BehaviorSubject(undefined);
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
  const api = {
    filters$,
    query$,
    timeRange$,
  };

  test('should not fire on subscribe', async () => {
    let count = 0;
    const subscription = newSession$(api).subscribe(() => {
      count++;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(count).toBe(0);
    subscription.unsubscribe();
  });

  describe('filter$', () => {
    const existsFilter = buildExistsFilter(
      {
        name: 'myFieldName',
      } as DataViewFieldBase,
      {
        id: 'myDataViewId',
      } as DataViewBase
    );

    test('should fire on filter change', async () => {
      filters$.next([existsFilter]);

      let count = 0;
      const subscription = newSession$(api).subscribe(() => {
        count++;
      });

      filters$.next([toggleFilterNegated(existsFilter)]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(count).toBe(1);
      subscription.unsubscribe();
    });

    test('should not fire on disabled filter change', async () => {
      const disabledFilter = disableFilter(existsFilter);
      filters$.next([disabledFilter]);

      let count = 0;
      const subscription = newSession$(api).subscribe(() => {
        count++;
      });

      filters$.next([toggleFilterNegated(disabledFilter)]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(count).toBe(0);
      subscription.unsubscribe();
    });

    test('should not fire on unpinned filter changing to pinned', async () => {
      filters$.next([existsFilter]);

      let count = 0;
      const subscription = newSession$(api).subscribe(() => {
        count++;
      });

      filters$.next([pinFilter(existsFilter)]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(count).toBe(0);
      subscription.unsubscribe();
    });

    test('should not fire on pinned filter changing to unpinned', async () => {
      filters$.next([pinFilter(existsFilter)]);

      let count = 0;
      const subscription = newSession$(api).subscribe(() => {
        count++;
      });

      filters$.next([existsFilter]);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(count).toBe(0);
      subscription.unsubscribe();
    });
  });

  describe('timeRange$', () => {
    test('should fire on timeRange change', async () => {
      timeRange$.next({ from: 'now-15m', to: 'now' });

      let count = 0;
      const subscription = newSession$(api).subscribe(() => {
        count++;
      });

      timeRange$.next({ from: 'now-30m', to: 'now' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(count).toBe(1);
      subscription.unsubscribe();
    });
  });
});
