/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Predicate } from './types';

/**
 * Find the first item in an iterable (such as array) that matches a predicate.
 *
 * @param iterable List of items to search through.
 * @param predicate Function to determine if an item is the one we are looking
 *     for.
 * @returns The first item that matches the predicate, or undefined if no item
 *     matches.
 */
export const findByPredicate = <T>(
  iterable: IterableIterator<T>,
  predicate: Predicate<T>
): T | undefined => {
  for (const item of iterable) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
};

/**
 * Shallowly compares two arrays for equality.
 *
 * @param a The first array to compare.
 * @param b The second array to compare.
 * @returns True if the arrays are equal, false otherwise.
 */
export const cmpArr = <T>(a: T[], b: T[]): boolean => {
  const length = a.length;
  if (length !== b.length) {
    return false;
  }

  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
};
