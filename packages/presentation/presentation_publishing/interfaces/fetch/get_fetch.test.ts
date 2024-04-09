/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { BehaviorSubject, Subject } from 'rxjs';
import { FetchContext, getFetch$ } from './get_fetch';

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

    test('should fire when fetch context changes', async () => {
      const subscription = getFetch$({ parentApi }).subscribe(onFetchMock);
      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.timeRange$.next({
        from: 'now-24h',
        to: 'now',
      });
      parentApi.timeslice$.next([0, 1]);
      setSearchSession();
      await new Promise((resolve) => setTimeout(resolve, 1));
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

    test('should fire on reload', async () => {
      const subscription = getFetch$({ parentApi }).subscribe(onFetchMock);
      parentApi.reload$.next();
      setSearchSession();
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(true);
      subscription.unsubscribe();
    });

    test('should fire on local time range change and no search session change', async () => {
      const api = {
        parentApi,
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
      const subscription = getFetch$(api).subscribe(onFetchMock);
      api.timeRange$.next({
        from: 'now-15m',
        to: 'now',
      });
      await new Promise((resolve) => setTimeout(resolve, 1));
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
    test('should fire on reload', async () => {
      const subscription = getFetch$({ parentApi }).subscribe(onFetchMock);
      parentApi.reload$.next();
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(onFetchMock.mock.calls).toHaveLength(1);
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(true);
      subscription.unsubscribe();
    });

    /*describe('local and parent time range', () => {
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

      test('should call onFetch with local time range', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: true,
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-15m',
          to: 'now',
        });
        unsubscribe();
      });

      test('should call onFetch when local time range changes', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: false,
        });
        api.timeRange$.next({
          from: 'now-16m',
          to: 'now',
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-16m',
          to: 'now',
        });
        unsubscribe();
      });

      test('should not call onFetch when parent time range changes', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: false,
        });
        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(0);
        unsubscribe();
      });

      test('should call onFetch with parent time range when local time range is cleared', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: false,
        });
        api.timeRange$.next(undefined);
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-24h',
          to: 'now',
        });
        unsubscribe();
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

      test('should call onFetch with parent time range', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: true,
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-24h',
          to: 'now',
        });
        unsubscribe();
      });

      test('should call onFetch when parent time range changes', async () => {
        const unsubscribe = onFetchContextChanged({
          api,
          onFetch: onFetchMock,
          fetchOnSetup: false,
        });
        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });
        await new Promise((resolve) => setTimeout(resolve, 1));
        expect(onFetchMock.mock.calls).toHaveLength(1);
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-25h',
          to: 'now',
        });
        unsubscribe();
      });
    });*/
  });
});
