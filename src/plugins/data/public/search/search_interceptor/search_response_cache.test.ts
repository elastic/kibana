/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { interval, Observable, of, throwError } from 'rxjs';
import { shareReplay, switchMap, take } from 'rxjs/operators';
import { IKibanaSearchResponse } from '../..';
import { SearchAbortController } from './search_abort_controller';
import { SearchResponseCache } from './search_response_cache';

describe('SearchResponseCache', () => {
  let cache: SearchResponseCache;
  let searchAbortController: SearchAbortController;
  const r: IKibanaSearchResponse[] = [
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 1,
      },
    },
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 2,
      },
    },
    {
      isPartial: true,
      isRunning: true,
      rawResponse: {
        t: 3,
      },
    },
    {
      isPartial: false,
      isRunning: false,
      rawResponse: {
        t: 4,
      },
    },
  ];

  function getSearchObservable$(responses: Array<IKibanaSearchResponse<any>> = r) {
    return interval(100).pipe(
      take(responses.length),
      switchMap((value: number, i: number) => {
        if (responses[i].rawResponse.throw === true) {
          return throwError('nooo');
        } else {
          return of(responses[i]);
        }
      }),
      shareReplay(1)
    );
  }

  function wrapWithAbortController(response$: Observable<IKibanaSearchResponse<any>>) {
    return {
      response$,
      searchAbortController,
    };
  }

  beforeEach(() => {
    cache = new SearchResponseCache(3, 0.1);
    searchAbortController = new SearchAbortController();
  });

  describe('Cache eviction', () => {
    test('clear evicts all', () => {
      const finalResult = r[r.length - 1];
      cache.set('123', wrapWithAbortController(of(finalResult)));
      cache.set('234', wrapWithAbortController(of(finalResult)));

      cache.clear();

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).toBeUndefined();
    });

    test('evicts searches that threw an exception', async () => {
      const res$ = getSearchObservable$();
      const err$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(1000),
          },
        },
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            throw: true,
          },
        },
      ]);
      cache.set('123', wrapWithAbortController(err$));
      cache.set('234', wrapWithAbortController(res$));

      const errHandler = jest.fn();
      await err$.toPromise().catch(errHandler);
      await res$.toPromise().catch(errHandler);

      expect(errHandler).toBeCalledTimes(1);
      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
    });

    test('evicts searches that returned an error response', async () => {
      const err$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 1,
          },
        },
        {
          isPartial: true,
          isRunning: false,
          rawResponse: {
            t: 2,
          },
        },
      ]);
      cache.set('123', wrapWithAbortController(err$));

      const errHandler = jest.fn();
      await err$.toPromise().catch(errHandler);

      expect(errHandler).toBeCalledTimes(0);
      expect(cache.get('123')).toBeUndefined();
    });

    test('evicts oldest item if has too many cached items', async () => {
      const finalResult = r[r.length - 1];
      cache.set('123', wrapWithAbortController(of(finalResult)));
      cache.set('234', wrapWithAbortController(of(finalResult)));
      cache.set('345', wrapWithAbortController(of(finalResult)));
      cache.set('456', wrapWithAbortController(of(finalResult)));

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).not.toBeUndefined();
      expect(cache.get('456')).not.toBeUndefined();
    });

    test('evicts oldest item if cache gets bigger than max size', async () => {
      const largeResult$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(1000),
          },
        },
        {
          isPartial: false,
          isRunning: false,
          rawResponse: {
            t: 'a'.repeat(50000),
          },
        },
      ]);

      cache.set('123', wrapWithAbortController(largeResult$));
      cache.set('234', wrapWithAbortController(largeResult$));
      cache.set('345', wrapWithAbortController(largeResult$));

      await largeResult$.toPromise();

      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).not.toBeUndefined();
    });

    test('evicts from cache any single item that gets bigger than max size', async () => {
      const largeResult$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(500),
          },
        },
        {
          isPartial: false,
          isRunning: false,
          rawResponse: {
            t: 'a'.repeat(500000),
          },
        },
      ]);

      cache.set('234', wrapWithAbortController(largeResult$));
      await largeResult$.toPromise();
      expect(cache.get('234')).toBeUndefined();
    });

    test('get updates the insertion time of an item', async () => {
      const finalResult = r[r.length - 1];
      cache.set('123', wrapWithAbortController(of(finalResult)));
      cache.set('234', wrapWithAbortController(of(finalResult)));
      cache.set('345', wrapWithAbortController(of(finalResult)));

      cache.get('123');
      cache.get('234');

      cache.set('456', wrapWithAbortController(of(finalResult)));

      expect(cache.get('123')).not.toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
      expect(cache.get('345')).toBeUndefined();
      expect(cache.get('456')).not.toBeUndefined();
    });
  });

  describe('Observable behavior', () => {
    test('caches a response and re-emits it', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', wrapWithAbortController(s$));
      const finalRes = await cache.get('123')!.response$.toPromise();
      expect(finalRes).toStrictEqual(r[r.length - 1]);
    });

    test('cached$ should emit same as original search$', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', wrapWithAbortController(s$));

      const next = jest.fn();
      const cached$ = cache.get('123');

      cached$!.response$.subscribe({
        next,
      });

      // wait for original search to complete
      await s$!.toPromise();

      // get final response from cached$
      const finalRes = await cached$!.response$.toPromise();
      expect(finalRes).toStrictEqual(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(4);
    });

    test('cached$ should emit only current value and keep emitting if subscribed while search$ is running', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', wrapWithAbortController(s$));

      const next = jest.fn();
      let cached$: Observable<IKibanaSearchResponse<any>> | undefined;
      s$.subscribe({
        next: (res) => {
          if (res.rawResponse.t === 3) {
            cached$ = cache.get('123')!.response$;
            cached$!.subscribe({
              next,
            });
          }
        },
      });

      // wait for original search to complete
      await s$!.toPromise();

      const finalRes = await cached$!.toPromise();

      expect(finalRes).toStrictEqual(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test('cached$ should emit only last value if subscribed after search$ was complete 1', async () => {
      const finalResult = r[r.length - 1];
      const s$ = wrapWithAbortController(of(finalResult));
      cache.set('123', s$);

      // wait for original search to complete
      await s$!.response$.toPromise();

      const next = jest.fn();
      const cached$ = cache.get('123');
      cached$!.response$.subscribe({
        next,
      });

      const finalRes = await cached$!.response$.toPromise();

      expect(finalRes).toStrictEqual(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('cached$ should emit only last value if subscribed after search$ was complete', async () => {
      const s$ = getSearchObservable$();
      cache.set('123', wrapWithAbortController(s$));

      // wait for original search to complete
      await s$!.toPromise();

      const next = jest.fn();
      const cached$ = cache.get('123');
      cached$!.response$.subscribe({
        next,
      });

      const finalRes = await cached$!.response$.toPromise();

      expect(finalRes).toStrictEqual(r[r.length - 1]);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
