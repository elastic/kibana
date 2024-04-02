/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { BehaviorSubject, Subject } from 'rxjs';
import { onFetchContextChanged } from './on_fetch_context_changed';

describe('onFetchContextChanged', () => {
  const onFetchMock = jest.fn();
  const parentApi = {
    filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
    reload$: new Subject<void>(),
    searchSessionId$: new BehaviorSubject<string | undefined>(undefined),
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };

  beforeEach(() => {
    onFetchMock.mockReset();
    parentApi.filters$.next(undefined);
    parentApi.query$.next(undefined);
    parentApi.searchSessionId$.next(undefined);
    parentApi.timeRange$.next(undefined);
  });

  /*describe('searchSessionId', () => {
  });*/

  describe('no searchSession$', () => {
    describe('local and parent time range', () => {
      const api = {
        parentApi,
        timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      }
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

      it('should call onFetch with local time range', async () => {
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

      it('should call onFetch when local time range changes', async () => {
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

      it('should not call onFetch when parent time range changes', async () => {
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

      it('should call onFetch with parent time range when local time range is cleared', async () => {
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
      }
      beforeEach(() => {
        api.parentApi.timeRange$.next({
          from: 'now-24h',
          to: 'now',
        });
      });

      it('should call onFetch with parent time range', async () => {
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

      it('should call onFetch when parent time range changes', async () => {
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
    });
  });
});
