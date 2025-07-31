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
import { logStateDiff, shouldLogStateDiff } from './state_diff_logger';

const referenceEquality = <T>(a: T, b: T) => a === b;
const deepEquality = <T>(a: T, b: T) => deepEqual(a, b);

export const runComparator = <StateType extends object = object>(
  comparator: StateComparators<StateType>[keyof StateType],
  lastSavedState?: Partial<StateType>,
  latestState?: Partial<StateType>,
  lastSavedValue?: StateType[keyof StateType],
  latestValue?: StateType[keyof StateType]
): boolean => {
  if (comparator === 'skip') return true;
  if (comparator === 'deepEquality') return deepEquality(lastSavedValue, latestValue);
  if (comparator === 'referenceEquality') return referenceEquality(lastSavedValue, latestValue);
  if (typeof comparator === 'function') {
    return comparator(lastSavedValue, latestValue, lastSavedState, latestState);
  }
  throw new Error(`Comparator ${comparator} is not a valid comparator.`);
};

/**
 * Run all comparators, and return an object containing only the keys that are not equal, set to the value of the latest state
 */
export const diffComparators = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: StateType,
  latestState?: StateType
): Partial<StateType> => {
  return Object.keys(comparators).reduce((acc, key) => {
    const comparator = comparators[key as keyof StateType];
    const lastSavedValue = lastSavedState?.[key as keyof StateType];
    const currentValue = latestState?.[key as keyof StateType];

    if (!runComparator(comparator, lastSavedState, latestState, lastSavedValue, currentValue)) {
      acc[key as keyof StateType] = currentValue;
      logStateDiff(key, lastSavedValue, currentValue);
    }

    return acc;
  }, {} as Partial<StateType>);
};

/**
 * Run comparators until at least one returns false
 */
export const areComparatorsEqual = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: StateType,
  currentState?: StateType,
  defaultState?: Partial<StateType>,
  getCustomLogLabel?: (key: string) => string
): boolean => {
  return Object.keys(comparators).every((key) => {
    const comparator = comparators[key as keyof StateType];
    const lastSavedValue =
      lastSavedState?.[key as keyof StateType] ?? defaultState?.[key as keyof StateType];
    const currentValue =
      currentState?.[key as keyof StateType] ?? defaultState?.[key as keyof StateType];

    const areEqual = runComparator(
      comparator,
      lastSavedState,
      currentState,
      lastSavedValue,
      currentValue
    );

    if (!areEqual && shouldLogStateDiff())
      logStateDiff(getCustomLogLabel ? getCustomLogLabel(key) : key, lastSavedValue, currentValue);
    return areEqual;
  });
};
