/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { StateComparators } from './types';

const referenceEquality = <T>(a: T, b: T) => a === b;
const deepEquality = <T>(a: T, b: T) => deepEqual(a, b);

export const runComparator = <StateType extends object = object>(
  comparator: StateComparators<StateType>[keyof StateType],
  lastSavedState?: StateType,
  latestState?: StateType,
  lastSavedValue?: StateType[keyof StateType],
  latestValue?: StateType[keyof StateType]
): boolean => {
  if (comparator === 'referenceEquality') return referenceEquality(lastSavedValue, latestValue);
  if (comparator === 'deepEquality') return deepEquality(lastSavedValue, latestValue);
  if (typeof comparator === 'function') {
    return comparator(lastSavedValue, latestValue, lastSavedState, latestState);
  }
  throw new Error(`Comparator ${comparator} is not a valid comparator.`);
};

export const areComparatorsEqual = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: StateType,
  latestState?: StateType
): boolean => {
  return Object.keys(comparators).every((key) => {
    const comparator = comparators[key as keyof StateType];
    const lastSavedValue = lastSavedState?.[key as keyof StateType];
    const currentValue = latestState?.[key as keyof StateType];

    return runComparator(comparator, lastSavedState, latestState, lastSavedValue, currentValue);
  });
};
