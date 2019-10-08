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
import { tap, repeatWhen, switchMap } from 'rxjs/operators';

/**
 * Create an Observable BehaviorSubject to invoke a function on an interval
 * which returns the next value for the observable.
 * @public
 */
export class Poller<T> {
  private readonly value$: Rx.BehaviorSubject<T>;
  private readonly subscription: Rx.Subscription;
  constructor(
    frequency: number,
    initialValue: T,
    handler: (iteration: number) => Promise<T | undefined> | T | undefined
  ) {
    let iteration = -1;

    this.value$ = new Rx.BehaviorSubject(initialValue);
    this.subscription = Rx.defer(() => {
      const value = handler(++iteration);
      // return sync values synchronously to make tests simpler
      return Rx.from(value instanceof Promise ? value : [value]);
    })
      .pipe(
        tap(value => {
          if (value !== undefined) {
            this.value$.next(value);
          }
        }),
        repeatWhen(complete$ => complete$.pipe(switchMap(() => Rx.timer(frequency))))
      )
      .subscribe(undefined, error => {
        this.value$.error(error);
      });
  }

  getValue() {
    return this.value$.getValue();
  }

  get$() {
    return this.value$.asObservable();
  }

  /**
   * Permanently end the polling operation.
   */
  unsubscribe() {
    this.value$.complete();
    this.subscription.unsubscribe();
  }
}
