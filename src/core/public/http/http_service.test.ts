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

import * as Rx from 'rxjs';
import { toArray } from 'rxjs/operators';

import { HttpService } from './http_service';

function setup() {
  const service = new HttpService();
  const fatalErrors: any = {
    add: jest.fn(),
  };
  const start = service.start({ fatalErrors });

  return { service, fatalErrors, start };
}

describe('addLoadingCount()', async () => {
  it('subscribes to passed in sources, unsubscribes on stop', () => {
    const { service, start } = setup();

    const unsubA = jest.fn();
    const subA = jest.fn().mockReturnValue(unsubA);
    start.addLoadingCount(new Rx.Observable(subA));
    expect(subA).toHaveBeenCalledTimes(1);
    expect(unsubA).not.toHaveBeenCalled();

    const unsubB = jest.fn();
    const subB = jest.fn().mockReturnValue(unsubB);
    start.addLoadingCount(new Rx.Observable(subB));
    expect(subB).toHaveBeenCalledTimes(1);
    expect(unsubB).not.toHaveBeenCalled();

    service.stop();

    expect(subA).toHaveBeenCalledTimes(1);
    expect(unsubA).toHaveBeenCalledTimes(1);
    expect(subB).toHaveBeenCalledTimes(1);
    expect(unsubB).toHaveBeenCalledTimes(1);
  });

  it('adds a fatal error if source observables emit an error', async () => {
    const { start, fatalErrors } = setup();

    start.addLoadingCount(Rx.throwError(new Error('foo bar')));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });

  it('adds a fatal error if source observable emits a negative number', async () => {
    const { start, fatalErrors } = setup();

    start.addLoadingCount(Rx.of(1, 2, 3, 4, -9));
    expect(fatalErrors.add.mock.calls).toMatchSnapshot();
  });
});

describe('getLoadingCount$()', async () => {
  it('emits 0 initially, the right count when sources emit their own count, and ends with zero', async () => {
    const { service, start } = setup();

    const countA$ = new Rx.Subject<number>();
    const countB$ = new Rx.Subject<number>();
    const countC$ = new Rx.Subject<number>();
    const promise = start
      .getLoadingCount$()
      .pipe(toArray())
      .toPromise();

    start.addLoadingCount(countA$);
    start.addLoadingCount(countB$);
    start.addLoadingCount(countC$);

    countA$.next(100);
    countB$.next(10);
    countC$.next(1);
    countA$.complete();
    countB$.next(20);
    countC$.complete();
    countB$.next(0);

    service.stop();
    expect(await promise).toMatchSnapshot();
  });

  it('only emits when loading count changes', async () => {
    const { service, start } = setup();

    const count$ = new Rx.Subject<number>();
    const promise = start
      .getLoadingCount$()
      .pipe(toArray())
      .toPromise();

    start.addLoadingCount(count$);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(0);
    count$.next(1);
    count$.next(1);
    service.stop();

    expect(await promise).toMatchSnapshot();
  });
});
