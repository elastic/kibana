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

import { Observable, Subscription } from '../observable';

/**
 * Creates an observable that combines all observables passed as arguments into
 * a single output observable by subscribing to them in series, i.e. it will
 * subscribe to the next observable when the previous completes.
 *
 * @param {Observable...}
 * @return {Observable}
 */
export function $concat<T>(...observables: Array<Observable<T>>) {
  return new Observable(observer => {
    let subscription: Subscription | undefined;

    function subscribe(i: number) {
      if (observer.closed) {
        return;
      }

      if (i >= observables.length) {
        observer.complete();
      }

      subscription = observables[i].subscribe({
        next(value) {
          observer.next(value);
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          subscribe(i + 1);
        },
      });
    }

    subscribe(0);

    return () => {
      if (subscription !== undefined) {
        subscription.unsubscribe();
      }
    };
  });
}
