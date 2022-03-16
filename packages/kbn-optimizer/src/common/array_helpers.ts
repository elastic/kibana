/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export const ascending =
  <T>(...getters: Array<SortPropGetter<T>>): Comparator<T> =>
  (a, b) => {
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
