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

type SortPropGetter<T> = (x: T) => number | string | undefined;
type Comparator<T> = (a: T, b: T) => number;

/**
 * create a sort comparator that sorts objects in ascending
 * order based on the ...getters. getters are called for each
 * item and return the value to compare against the other items.
 *
 * - if a getter returns undefined the item will be sorted
 *    before all other items
 * - if a getter returns a string it will be compared using
 *    `String#localeCompare`
 * - otherwise comparison is done using subtraction
 * - If the values for a getter are equal the next getter is
 *    used to compare the items.
 */
export const ascending = <T>(...getters: Array<SortPropGetter<T>>): Comparator<T> => (a, b) => {
  for (const getter of getters) {
    const valA = getter(a);
    const valB = getter(b);

    if (valA === valB) {
      continue;
    }
    if (valA === undefined) {
      return -1;
    }
    if (valB === undefined) {
      return 1;
    }

    return typeof valA === 'string' || typeof valB === 'string'
      ? String(valA).localeCompare(String(valB))
      : valA - valB;
  }

  return 0;
};

/**
 * create a sort comparator that sorts values in descending
 * order based on the ...getters
 *
 * See docs for ascending()
 */
export const descending = <T>(...getters: Array<SortPropGetter<T>>): Comparator<T> => {
  const sorter = ascending(...getters);
  return (a, b) => sorter(b, a);
};

/**
 * Alternate Array#includes() implementation with sane types, functions as a type guard
 */
export const includes = <T>(array: T[], value: any): value is T => array.includes(value);

/**
 * Ponyfill for Object.fromEntries()
 */
export const entriesToObject = <T>(entries: Array<readonly [string, T]>): Record<string, T> => {
  const object: Record<string, T> = {};
  for (const [key, value] of entries) {
    object[key] = value;
  }
  return object;
};
