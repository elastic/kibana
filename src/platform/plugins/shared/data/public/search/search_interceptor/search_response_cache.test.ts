/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { interval, of, Subject, throwError } from 'rxjs';
import { shareReplay, switchMap, take } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
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

  function wrapWithAbortController(
    response$: Observable<IKibanaSearchResponse>,
    groupId = 'session'
  ) {
    return {
      groupId,
      response$,
      searchAbortController,
    };
  }

  beforeEach(() => {
    cache = new SearchResponseCache(0.1);
    searchAbortController = new SearchAbortController();
  });

  describe('Cache eviction', () => {
    test('keeps more than 50 responses in a group when they fit within the byte limit', () => {
      const response$ = of(r[3]);

      for (let responseIndex = 0; responseIndex < 51; responseIndex++) {
        cache.set(String(responseIndex), wrapWithAbortController(response$));
      }

      for (let responseIndex = 0; responseIndex < 51; responseIndex++) {
        expect(cache.has(String(responseIndex))).toBe(true);
      }

      expect(cache.hasCompletedResponses('session')).toBe(true);
    });

    test('evicts a requested group without removing other groups', () => {
      const response$ = of(r[3]);
      cache.set('first-a', wrapWithAbortController(response$, 'first'));
      cache.set('second', wrapWithAbortController(response$, 'second'));
      cache.set('first-b', wrapWithAbortController(response$, 'first'));

      cache.evictGroup('first');

      expect(cache.hasCompletedResponses('first')).toBe(false);
      expect(cache.has('first-a')).toBe(false);
      expect(cache.has('first-b')).toBe(false);
      expect(cache.hasCompletedResponses('second')).toBe(true);
    });

    test('response arrival updates group recency before eviction', () => {
      const largeResponse = { ...r[3], rawResponse: { value: 'a'.repeat(40000) } };
      const response$ = new Subject<IKibanaSearchResponse>();
      cache.set('slow', wrapWithAbortController(response$, 'slow'));
      cache.set('idle', wrapWithAbortController(of(largeResponse), 'idle'));
      response$.next(largeResponse);
      response$.complete();
      cache.set('new', wrapWithAbortController(of(largeResponse), 'new'));
      expect(cache.has('slow')).toBe(true);
      expect(cache.has('idle')).toBe(false);
      expect(cache.has('new')).toBe(true);
    });

    test('only completed, non-interrupted responses make a group available', () => {
      const response$ = new Subject<IKibanaSearchResponse>();
      cache.set('pending', wrapWithAbortController(response$));
      response$.next(r[0]);
      expect(cache.hasCompletedResponses('session')).toBe(false);

      response$.complete();
      expect(cache.has('pending')).toBe(false);

      searchAbortController.abort();
      cache.set('interrupted', wrapWithAbortController(of(r[3])));
      expect(cache.hasCompletedResponses('session')).toBe(false);
      expect(cache.has('interrupted')).toBe(false);
    });

    test('evicts every response of the least recently used group when exceeding the byte limit', () => {
      const response$ = of({ ...r[3], rawResponse: { value: 'a'.repeat(30000) } });
      cache.set('first-a', wrapWithAbortController(response$, 'first'));
      cache.set('second', wrapWithAbortController(response$, 'second'));
      cache.set('first-b', wrapWithAbortController(response$, 'first'));
      cache.get('second');

      cache.set('third', wrapWithAbortController(response$, 'third'));

      expect(cache.has('first-a')).toBe(false);
      expect(cache.has('first-b')).toBe(false);
      expect(cache.hasCompletedResponses('first')).toBe(false);
      expect(cache.hasCompletedResponses('second')).toBe(true);
      expect(cache.hasCompletedResponses('third')).toBe(true);
    });

    test('does not reinsert a synchronously evicted response', () => {
      cache.set('large', wrapWithAbortController(of({ rawResponse: 'a'.repeat(500000) }, r[3])));

      expect(cache.has('large')).toBe(false);
    });

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

      expect(errHandler).toHaveBeenCalledTimes(1);
      expect(cache.get('123')).toBeUndefined();
      expect(cache.get('234')).not.toBeUndefined();
    });

    test('evicts searches that returned an error response', async () => {
      const err$ = getSearchObservable$([
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            t: 'a'.repeat(1000),
          },
        },
        {} as any,
      ]);
      cache.set('123', wrapWithAbortController(err$));

      const errHandler = jest.fn();
      await err$.toPromise().catch(errHandler);

      expect(errHandler).toHaveBeenCalledTimes(1);
      expect(cache.get('123')).toBeUndefined();
    });

    test('evicts the oldest group when completed responses exceed the byte limit', () => {
      const finalResult = { ...r[r.length - 1], rawResponse: { value: 'a'.repeat(30000) } };
      cache.set('123', wrapWithAbortController(of(finalResult), '123'));
      cache.set('234', wrapWithAbortController(of(finalResult), '234'));
      cache.set('345', wrapWithAbortController(of(finalResult), '345'));
      cache.set('456', wrapWithAbortController(of(finalResult), '456'));

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

      cache.set('123', wrapWithAbortController(largeResult$, '123'));
      cache.set('234', wrapWithAbortController(largeResult$, '234'));
      cache.set('345', wrapWithAbortController(largeResult$, '345'));

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

    test('get updates eviction priority when the byte limit is exceeded', () => {
      const finalResult = { ...r[r.length - 1], rawResponse: { value: 'a'.repeat(30000) } };
      cache.set('123', wrapWithAbortController(of(finalResult), '123'));
      cache.set('234', wrapWithAbortController(of(finalResult), '234'));
      cache.set('345', wrapWithAbortController(of(finalResult), '345'));

      cache.get('123');
      cache.get('234');

      cache.set('456', wrapWithAbortController(of(finalResult), '456'));

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
