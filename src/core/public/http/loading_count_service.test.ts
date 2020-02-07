/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable, throwError, of, Subject } from 'rxjs';
import { toArray } from 'rxjs/operators';

import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { LoadingCountService } from './loading_count_service';

describe('LoadingCountService', () => {
  const setup = () => {
    const fatalErrors = fatalErrorsServiceMock.createSetupContract();
    const service = new LoadingCountService();
    const loadingCount = service.setup({ fatalErrors });
    return { fatalErrors, loadingCount, service };
  };

  describe('addLoadingCountSource()', () => {
    it('subscribes to passed in sources, unsubscribes on stop', () => {
      const { service, loadingCount } = setup();

      const unsubA = jest.fn();
      const subA = jest.fn().mockReturnValue(unsubA);
      loadingCount.addLoadingCountSource(new Observable(subA));
      expect(subA).toHaveBeenCalledTimes(1);
      expect(unsubA).not.toHaveBeenCalled();

      const unsubB = jest.fn();
      const subB = jest.fn().mockReturnValue(unsubB);
      loadingCount.addLoadingCountSource(new Observable(subB));
      expect(subB).toHaveBeenCalledTimes(1);
      expect(unsubB).not.toHaveBeenCalled();

      service.stop();

      expect(subA).toHaveBeenCalledTimes(1);
      expect(unsubA).toHaveBeenCalledTimes(1);
      expect(subB).toHaveBeenCalledTimes(1);
      expect(unsubB).toHaveBeenCalledTimes(1);
    });

    it('adds a fatal error if source observables emit an error', () => {
      const { loadingCount, fatalErrors } = setup();

      loadingCount.addLoadingCountSource(throwError(new Error('foo bar')));
      expect(fatalErrors.add.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: foo bar],
          ],
        ]
      `);
    });

    it('adds a fatal error if source observable emits a negative number', () => {
      const { loadingCount, fatalErrors } = setup();

      loadingCount.addLoadingCountSource(of(1, 2, 3, 4, -9));
      expect(fatalErrors.add.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            [Error: Observables passed to loadingCount.add() must only emit positive numbers],
          ],
        ]
      `);
    });
  });

  describe('getLoadingCount$()', () => {
    it('emits 0 initially, the right count when sources emit their own count, and ends with zero', async () => {
      const { service, loadingCount } = setup();

      const countA$ = new Subject<number>();
      const countB$ = new Subject<number>();
      const countC$ = new Subject<number>();
      const promise = loadingCount
        .getLoadingCount$()
        .pipe(toArray())
        .toPromise();

      loadingCount.addLoadingCountSource(countA$);
      loadingCount.addLoadingCountSource(countB$);
      loadingCount.addLoadingCountSource(countC$);

      countA$.next(100);
      countB$.next(10);
      countC$.next(1);
      countA$.complete();
      countB$.next(20);
      countC$.complete();
      countB$.next(0);

      service.stop();
      expect(await promise).toMatchInlineSnapshot(`
        Array [
          0,
          100,
          110,
          111,
          11,
          21,
          20,
          0,
        ]
      `);
    });

    it('only emits when loading count changes', async () => {
      const { service, loadingCount } = setup();

      const count$ = new Subject<number>();
      const promise = loadingCount
        .getLoadingCount$()
        .pipe(toArray())
        .toPromise();

      loadingCount.addLoadingCountSource(count$);
      count$.next(0);
      count$.next(0);
      count$.next(0);
      count$.next(0);
      count$.next(0);
      count$.next(1);
      count$.next(1);
      service.stop();

      expect(await promise).toMatchInlineSnapshot(`
        Array [
          0,
          1,
          0,
        ]
      `);
    });
  });
});
