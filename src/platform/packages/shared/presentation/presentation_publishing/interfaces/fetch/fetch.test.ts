/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { BehaviorSubject, skip, Subject } from 'rxjs';
import { fetch$ } from './fetch';

describe('onFetchContextChanged', () => {
  const onFetchMock = jest.fn();
  const parentApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
    reload$: new Subject<void>(),
    searchSessionId$: new BehaviorSubject<string | undefined>(undefined),
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
    timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
  };

  beforeEach(() => {
    onFetchMock.mockReset();
    parentApi.filters$.next(undefined);
    parentApi.query$.next(undefined);
    parentApi.searchSessionId$.next(undefined);
    parentApi.timeRange$.next(undefined);
    parentApi.timeslice$.next(undefined);
  });

  describe('searchSessionId', () => {
    let i = 0;
    function setSearchSession() {
      i++;
      parentApi.searchSessionId$.next(`${i}`);
    }
    beforeEach(() => {
      i = 0;
      setSearchSession();
    });

    test('should emit on subscribe when only searchSession is provided', async () => {
      const api = {
        parentApi: {
          searchSessionId$: parentApi.searchSessionId$,
        },
      };
      const subscription = fetch$(api).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.searchSessionId).toBe('1');
      subscription.unsubscribe();
    });

    test('should emit once on fetch context changes', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.timeRange$.next({
        from: 'now-24h',
        to: 'now',
      });
      parentApi.timeslice$.next([0, 1]);
      setSearchSession();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual({
        filters: [],
        isReload: true,
        query: {
          language: 'kquery',
          query: '',
        },
        searchSessionId: '2',
        timeRange: {
          from: 'now-24h',
          to: 'now',
        },
        timeslice: [0, 1],
      });
      subscription.unsubscribe();
    });

    test('should emit once on reload', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.reload$.next();
      setSearchSession();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(true);
      subscription.unsubscribe();
    });

    test('should emit once on local time range change', async () => {
      const api = {
        parentApi,
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
      const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock).not.toHaveBeenCalled();

      api.timeRange$.next({
        from: 'now-15m',
        to: 'now',
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(false);
      expect(fetchContext.timeRange).toEqual({
        from: 'now-15m',
        to: 'now',
      });
      subscription.unsubscribe();
    });
  });

  describe('no searchSession$', () => {
    test('should emit once on reload', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.reload$.next();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(true);
      subscription.unsubscribe();
    });

    test('should emit once on fetch context changes', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.timeRange$.next({
        from: 'now-24h',
        to: 'now',
      });
      parentApi.timeslice$.next([0, 1]);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual({
        filters: [],
        isReload: false,
        query: {
          language: 'kquery',
          query: '',
        },
        searchSessionId: undefined,
        timeRange: {
          from: 'now-24h',
          to: 'now',
        },
        timeslice: [0, 1],
      });
      subscription.unsubscribe();
    });

    describe('local and parent time range', () => {
      const api = {
        parentApi,
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
      beforeEach(() => {
        api.timeRange$.next({
          from: 'now-15m',
          to: 'now',
        });
        api.parentApi.timeRange$.next({
          from: 'now-24h',
          to: 'now',
        });
      });

      test('should emit on subscribe (timeRange is local time range)', async () => {
        const subscription = fetch$(api).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-15m',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should emit once on local time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock).not.toHaveBeenCalled();

        api.timeRange$.next({
          from: 'now-16m',
          to: 'now',
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-16m',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should not emit on parent time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock).not.toHaveBeenCalled();
        subscription.unsubscribe();
      });

      test('should emit once when local time range is cleared (timeRange is parent time range)', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock).not.toHaveBeenCalled();

        api.timeRange$.next(undefined);

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-24h',
          to: 'now',
        });
        subscription.unsubscribe();
      });
    });

    describe('only parent time range', () => {
      const api = {
        parentApi,
      };
      beforeEach(() => {
        api.parentApi.timeRange$.next({
          from: 'now-24h',
          to: 'now',
        });
      });

      test('should emit on subscribe (timeRange is parent time range)', async () => {
        const subscription = fetch$(api).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-24h',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should emit once on parent time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-25h',
          to: 'now',
        });
        subscription.unsubscribe();
      });
    });
  });
});
