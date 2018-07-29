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

import { from } from 'rxjs';
import { Observable } from '../';
import { MonoTypeOperatorFunction } from '../interfaces';
import { rxjsToEsObservable } from '../lib';

/**
 * Only subscribes once to the underlying source observable, and remembers
 * the last value emitted by the source. Therefore, if a second observer subscribes
 * it will immediately receive the latest value from the source, similarly to
 * how a BehaviorSubject immediately sends the current value on subscribe.
 *
 * When all subsscribers unsubscribe, the shared subscription on the source
 * observable will be unsubscribed. Later on if there is a new subscription, a
 * new subscription will be made on the source observable.
 * Explained in code:
 *
 * ```
 * const source = new Observable(observer => {
 *   // do expensive work
 *   observer.next(someValue);
 * });
 *
 * const obs = k$(source)(shareLast(1));
 *
 * // This `subscribe` will make `obs` subscribe to the `source` observable
 * const sub1 = obs.subscribe({
 *   next(value) {
 *     console.log(1, value);
 *   }
 * });
 *
 * // This `subscribe` will share the same subscription as `sub1` to the
 * // `source` observable instead of creating a new execution.
 * const sub2 = obs.subscribe({
 *   next(value) {
 *     console.log(2, value);
 *   }
 * });
 *
 * // After this `unsubscribe` the subscription initialized by `sub1` above will
 * // still "be open" as `sub2` hasn't unsubscribed yet. If the `source` sends
 * // new values they will still be received by `sub2`, but no longer by `sub1`
 * // as soon as it's unsubscribed.
 * sub1.unsubscribe();
 *
 * // This will cause an `unsubscribe` to the `source` observable as this is the
 * // last subscription to the shared observable execution.
 * sub2.unsubscribe();
 *
 * // This will initiate a new `subscribe` to the `source` observable.
 * const sub3 = obs.subscribe({
 *   next(value) {
 *     console.log(3, value);
 *   }
 * });
 * ```
 *
 * **NOTE** This depends on RxJS directly just for a simpler implementation in
 * the short-term, and not because of some other overlying strategy. The
 * intention is to move this to a "home-made" implementation, so we can remove
 * the direct RxJS dependency.
 *
 * @returns An Observable of the first item received.
 */
export function shareLast<T>(): MonoTypeOperatorFunction<T> {
  return function shareLastOperation(source: Observable<T>) {
    return rxjsToEsObservable(from(source).shareReplay(1));
  };
}
