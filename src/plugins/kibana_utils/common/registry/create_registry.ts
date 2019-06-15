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
import { Registry } from './types';
import { Observable, Subject } from 'rxjs';

export const createRegistry = <T>(): Registry<T> => {
  let data = new Map<string, T>();

  const set$ = new Subject();
  const clear$ = new Subject();

  const set = (id: string, obj: T) => {
    data.set(id, obj);
    set$.next(obj);
  };

  const clear = () => {
    data = new Map<string, T>();
    clear$.next();
  };

  const ni = () => { throw new Error('not implemented'); };

  const iterable = {
    * [Symbol.iterator]() {
      for (const item of data) yield item;
    }
  };

  function * entries () {
    for (const entry of iterable) yield entry;
  }

  function * keys () {
    for (const [key] of iterable) yield key;
  }

  function * values () {
    for (const [, value] of iterable) yield value;
  }

  return {
    ...iterable,
    entries,
    keys,
    values,
    get: id => data.get(id),
    set,
    set$: (set$ as unknown) as Observable<T>,
    clear: () => data.clear(),
    clear$: (clear as unknown) as Observable<void>,
    size: () => data.size,
    find: ni,
    findBy: ni,
    filter: ni,
    filterBy: ni,
  }
}
