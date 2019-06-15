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
import { Observable, Subject } from 'rxjs';
import { Registry } from './types';

export const createRegistry = <T>(): Registry<T> => {
  let data = new Map<string, T>();

  const set$ = new Subject();
  const clear$ = new Subject();

  const iterable = {
    *[Symbol.iterator]() {
      for (const item of data) yield item;
    },
  };

  function* ids() {
    for (const [id] of iterable) yield id;
  }

  function* records() {
    for (const [, record] of iterable) yield record;
  }

  const find: Registry<T>['find'] = predicate => {
    for (const record of records()) {
      if (predicate(record)) return record;
    }
    return undefined;
  };

  const set = (id: string, record: T) => {
    data.set(id, record);
    set$.next(record);
  };

  const clear = () => {
    data = new Map<string, T>();
    clear$.next();
  };

  const ni = () => {
    throw new Error('not implemented');
  };

  return {
    ...iterable,
    ids,
    records,
    get: id => data.get(id),
    size: () => data.size,
    find,
    findBy: ni,
    filter: ni,
    filterBy: ni,
    set,
    set$: (set$ as unknown) as Observable<T>,
    clear,
    clear$: (clear$ as unknown) as Observable<void>,
  };
};
