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

import { Observable } from '../observable';
/**
 * Transforms an RxJS observable into a "spec-compliant" observable.
 * (See https://github.com/tc39/proposal-observable)
 *
 * This should not be used internally in the platform, but is intended to
 * transform observables in "leaf nodes", before we hand over to plugins. This
 * ensures that plugins don't need to depend on RxJS, and we're free to update
 * that dependency or change how we handle observables internally.
 *
 * As the Observables spec defines a `Symbol.observable`, which we include in
 * `kbn-observable`, the observables we create here can be used in most other
 * observable libraries, e.g.
 *
 * - using RxJS: Observable.from(someKibanaObservable)
 * - using Bacon: Bacon.fromESObservable(someKibanaObservable)
 * - using Kefir: Kefir.fromESObservable(someKibanaObservable)
 */
export function rxjsToEsObservable<T>(source: Observable<T>) {
  // TODO: type the observer
  return new Observable(observer =>
    observable.subscribe({
      complete: () => {
        observer.complete();
      },
      error: err => {
        observer.error(err);
      },
      next: val => {
        observer.next(val);
      },
    })
  );
}
