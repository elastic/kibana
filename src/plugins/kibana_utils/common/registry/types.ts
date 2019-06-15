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

import { Observable } from 'rxjs';

export type Predicate<T> = (item: T) => boolean;

/**
 * @todo `Iterable` interface seems to be overwritten by JQuery, so it is redefined here.
 */
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}

export interface RegistryIterators<T> extends Iterable<[string, T]> {
  ids: () => Iterable<string>;
  records: () => Iterable<T>;
}

export interface RegistryReadOnly<T extends {}> extends RegistryIterators<T> {
  get: (key: string) => T | undefined;
  size: () => number;
  find: (predicate: Predicate<T>) => T;
  findBy: (attribute: keyof T, value: T[keyof T]) => T;
  filter: (predicate: Predicate<T>) => Iterable<T>;
  filterBy: (attribute: keyof T, value: T[keyof T]) => Iterable<T>;
}

export interface RegistryMutable<T extends {}> {
  set: (key: string, record: T) => void;
  clear: () => void;
  set$: Observable<T>;
  clear$: Observable<void>;
}

export interface Registry<T extends {}> extends RegistryReadOnly<T>, RegistryMutable<T> {}
