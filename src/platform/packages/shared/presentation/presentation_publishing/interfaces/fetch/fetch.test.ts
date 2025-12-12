/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import { waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject, skip } from 'rxjs';
import { fetch$ } from './fetch';

const searchSessionRequestCompleteCallback = jest.fn();
const waitForSearchSession = async () => {
  await waitFor(() => {
    expect(searchSessionRequestCompleteCallback).toBeCalled();
    searchSessionRequestCompleteCallback.mockClear();
  });
};

describe('onFetchContextChanged', () => {
  const onFetchMock = jest.fn();
  const searchSessionId$ = new BehaviorSubject<string | undefined>(undefined);
  const parentApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
    reload$: new Subject<void>(),
    searchSessionId$,
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
    timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
    requestSearchSessionId: jest.fn().mockImplementation(async () => {
      const sessionId = await new Promise<string | undefined>((resolve) => {
        setTimeout(() => {
          resolve(searchSessionId$.getValue());
        }, 10);
      });
      searchSessionRequestCompleteCallback();
      return sessionId;
    }),
  };

  beforeEach(() => {
    onFetchMock.mockReset();
    searchSessionRequestCompleteCallback.mockClear();
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

    test('should emit once on fetch context changes', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await waitForSearchSession();
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.timeRange$.next({
        from: 'now-24h',
        to: 'now',
      });
      parentApi.timeslice$.next([0, 1]);
      setSearchSession();

      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual({
        filters: [],
        isReload: false,
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
      await waitForSearchSession();
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.reload$.next();
      setSearchSession();
      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });

      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual(
        expect.objectContaining({
          isReload: true,
          searchSessionId: '2',
        })
      );
      subscription.unsubscribe();
    });

    test('should emit once on local time range change', async () => {
      const api = {
        parentApi,
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      };
      const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
      await waitForSearchSession();
      expect(onFetchMock).not.toHaveBeenCalled();

      api.timeRange$.next({
        from: 'now-15m',
        to: 'now',
      });
      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });

      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual(
        expect.objectContaining({
          isReload: false,
          timeRange: { from: 'now-15m', to: 'now' },
        })
      );
      subscription.unsubscribe();
    });
  });

  describe('with isFetchPaused$', () => {
    test('should skip emits while fetch is paused', async () => {
      const isFetchPaused$ = new BehaviorSubject<boolean>(true);
      const api = {
        parentApi,
        isFetchPaused$,
      };
      const subscription = fetch$(api).subscribe(onFetchMock);

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: 'hello' });
      parentApi.reload$.next();

      await new Promise((resolve) => setTimeout(resolve, 100)); // search session ID is not requested so use generic timeout
      expect(onFetchMock).not.toHaveBeenCalled();

      subscription.unsubscribe();
    });

    test('should emit most recent context when fetch becomes un-paused', async () => {
      const isFetchPaused$ = new BehaviorSubject<boolean>(true);
      const api = {
        parentApi,
        isFetchPaused$,
      };
      const subscription = fetch$(api).subscribe(onFetchMock);

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.reload$.next();

      isFetchPaused$.next(false);
      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext).toEqual({
        filters: [],
        isReload: true,
        query: {
          language: 'kquery',
          query: '',
        },
        searchSessionId: undefined,
        timeRange: undefined,
        timeslice: undefined,
      });

      subscription.unsubscribe();
    });
  });

  describe('no searchSession$', () => {
    test('should emit once on reload', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await waitForSearchSession();
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.reload$.next();

      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });
      const fetchContext = onFetchMock.mock.calls[0][0];
      expect(fetchContext.isReload).toBe(true);
      subscription.unsubscribe();
    });

    test('should emit once on fetch context changes', async () => {
      const subscription = fetch$({ parentApi }).pipe(skip(1)).subscribe(onFetchMock);
      await waitForSearchSession();
      expect(onFetchMock).not.toHaveBeenCalled();

      parentApi.filters$.next([]);
      parentApi.query$.next({ language: 'kquery', query: '' });
      parentApi.timeRange$.next({
        from: 'now-24h',
        to: 'now',
      });
      parentApi.timeslice$.next([0, 1]);

      await waitFor(() => {
        expect(onFetchMock).toHaveBeenCalledTimes(1);
      });
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
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-15m',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should emit once on local time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();

        api.timeRange$.next({
          from: 'now-16m',
          to: 'now',
        });
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });

        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-16m',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should not emit on parent time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });
        await new Promise((resolve) => setTimeout(resolve, 100)); // search session ID is not requested so use generic timeout
        expect(onFetchMock).not.toHaveBeenCalled();
        subscription.unsubscribe();
      });

      test('should emit once when local time range is cleared (timeRange is parent time range)', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.timeRange$.next(undefined);
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
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
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-24h',
          to: 'now',
        });
        subscription.unsubscribe();
      });

      test('should emit once on parent time range change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.timeRange$.next({
          from: 'now-25h',
          to: 'now',
        });

        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.timeRange).toEqual({
          from: 'now-25h',
          to: 'now',
        });
        subscription.unsubscribe();
      });
    });

    describe('local and parent project routing', () => {
      const api = {
        parentApi: {
          ...parentApi,
          projectRouting$: new BehaviorSubject<ProjectRouting | undefined>('ALL'),
        },
        projectRouting$: new BehaviorSubject<ProjectRouting | undefined>('_alias:_origin'),
      };

      test('should emit on subscribe (projectRouting is local projectRouting)', async () => {
        const subscription = fetch$(api).subscribe(onFetchMock);
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.projectRouting).toEqual('_alias:_origin');
        subscription.unsubscribe();
      });

      test('should emit once on local project routing change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();

        api.projectRouting$.next('project1');
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });

        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.projectRouting).toEqual('project1');
        subscription.unsubscribe();
      });

      test('should not emit on parent project routing change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.projectRouting$.next('project2');
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(onFetchMock).not.toHaveBeenCalled();
        subscription.unsubscribe();
      });

      test('should emit once when local project routing is cleared (projectRouting is parent projectRouting)', async () => {
        // Reset parent projectRouting to 'ALL' in case previous test changed it
        api.parentApi.projectRouting$.next('ALL');
        api.projectRouting$.next('_alias:_origin'); // Reset local to initial value

        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.projectRouting$.next(undefined);
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.projectRouting).toEqual('ALL');
        subscription.unsubscribe();
      });
    });

    describe('only parent project routing', () => {
      const api = {
        parentApi: {
          ...parentApi,
          projectRouting$: new BehaviorSubject<ProjectRouting | undefined>('ALL'),
        },
      };

      test('should emit on subscribe (projectRouting is parent projectRouting)', async () => {
        const subscription = fetch$(api).subscribe(onFetchMock);
        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.projectRouting).toEqual('ALL');
        subscription.unsubscribe();
      });

      test('should emit once on parent project routing change', async () => {
        const subscription = fetch$(api).pipe(skip(1)).subscribe(onFetchMock);
        await waitForSearchSession();
        expect(onFetchMock).not.toHaveBeenCalled();

        api.parentApi.projectRouting$.next('_alias:_origin');

        await waitFor(() => {
          expect(onFetchMock).toHaveBeenCalledTimes(1);
        });
        const fetchContext = onFetchMock.mock.calls[0][0];
        expect(fetchContext.projectRouting).toEqual('_alias:_origin');
        subscription.unsubscribe();
      });
    });
  });
});
