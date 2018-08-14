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
import { LoadingCountService } from './loading_count_service';

function setup() {
  const service = new LoadingCountService();

  const startContract = service.start({
    fatalErrors: {
      add: jest.fn(),
    } as any,
  });

  return { service, startContract };
}

it('subscribes to observables passed to add(), unsubscribes on stop', () => {
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

it('emits 0 initially, and the right count when observables emit their own count', () => {
  const { startContract } = setup();

  const aCount = new Rx.Subject<number>();
  const bCount = new Rx.Subject<number>();
  const cCount = new Rx.Subject<number>();

  startContract.add(aCount);
  startContract.add(bCount);
  startContract.add(cCount);

  const onEach = jest.fn();
  startContract.getCount$().subscribe(onEach);
  expect(onEach).toHaveBeenCalledTimes(1);
  expect(onEach).toHaveBeenCalledWith(0);

  onEach.mockClear();

  aCount.next(15);
  bCount.next(1);
  cCount.next(1);
  aCount.next(0);
  bCount.next(2);
  cCount.next(0);
  bCount.next(0);
  expect(onEach.mock.calls).toMatchSnapshot();
});
