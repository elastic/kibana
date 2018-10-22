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

import { LoadingCountService } from './loading_count_service';

function setup() {
  const service = new LoadingCountService();
  const fatalErrors: any = {
    add: jest.fn(),
  };
  const startContract = service.start({ fatalErrors });

  return { service, fatalErrors, startContract };
}

it('subscribes to sources passed to add(), unsubscribes on stop', () => {
  const { service, startContract } = setup();

  const unsubA = jest.fn();
  const subA = jest.fn().mockReturnValue(unsubA);
  startContract.add(new Rx.Observable(subA));
  expect(subA).toHaveBeenCalledTimes(1);
  expect(unsubA).not.toHaveBeenCalled();

  const unsubB = jest.fn();
  const subB = jest.fn().mockReturnValue(unsubB);
  startContract.add(new Rx.Observable(subB));
  expect(subB).toHaveBeenCalledTimes(1);
  expect(unsubB).not.toHaveBeenCalled();

  service.stop();

  expect(subA).toHaveBeenCalledTimes(1);
  expect(unsubA).toHaveBeenCalledTimes(1);
  expect(subB).toHaveBeenCalledTimes(1);
  expect(unsubB).toHaveBeenCalledTimes(1);
});

it('emits 0 initially, the right count when sources emit their own count, and ends with zero', async () => {
  const { service, startContract } = setup();

  const countA$ = new Rx.Subject<number>();
  const countB$ = new Rx.Subject<number>();
  const countC$ = new Rx.Subject<number>();
  const promise = startContract
    .getCount$()
    .pipe(toArray())
    .toPromise();

  startContract.add(countA$);
  startContract.add(countB$);
  startContract.add(countC$);

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
  const { service, startContract } = setup();

  const count$ = new Rx.Subject<number>();
  const promise = startContract
    .getCount$()
    .pipe(toArray())
    .toPromise();

  startContract.add(count$);
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

it('adds a fatal error if count observables emit an error', async () => {
  const { startContract, fatalErrors } = setup();

  startContract.add(Rx.throwError(new Error('foo bar')));
  expect(fatalErrors.add.mock.calls).toMatchSnapshot();
});

it('adds a fatal error if count observable emits a negative number', async () => {
  const { startContract, fatalErrors } = setup();

  startContract.add(Rx.of(1, 2, 3, 4, -9));
  expect(fatalErrors.add.mock.calls).toMatchSnapshot();
});
