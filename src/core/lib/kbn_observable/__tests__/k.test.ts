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

import { MonoTypeOperatorFunction, OperatorFunction, UnaryFunction } from '../interfaces';
import { k$ } from '../k';
import { Observable } from '../observable';

const plus1: MonoTypeOperatorFunction<number> = source =>
  new Observable(observer => {
    source.subscribe({
      next(val) {
        observer.next(val + 1);
      },
      error(err) {
        observer.error(err);
      },
      complete() {
        observer.complete();
      },
    });
  });

const toString: OperatorFunction<number, string> = source =>
  new Observable(observer => {
    source.subscribe({
      next(val) {
        observer.next(val.toString());
      },
      error(err) {
        observer.error(err);
      },
      complete() {
        observer.complete();
      },
    });
  });

const toPromise: UnaryFunction<Observable<number>, Promise<number>> = source =>
  new Promise((resolve, reject) => {
    let lastValue: number;

    source.subscribe({
      next(value) {
        lastValue = value;
      },
      error(error) {
        reject(error);
      },
      complete() {
        resolve(lastValue);
      },
    });
  });

test('observable to observable', () => {
  const numbers$ = Observable.of(1, 2, 3);
  const actual: any[] = [];

  k$(numbers$)(plus1, toString).subscribe({
    next(x) {
      actual.push(x);
    },
  });

  expect(actual).toEqual(['2', '3', '4']);
});

test('observable to promise', async () => {
  const numbers$ = Observable.of(1, 2, 3);

  const value = await k$(numbers$)(plus1, toPromise);

  expect(value).toEqual(4);
});
