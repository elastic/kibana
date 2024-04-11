/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StateComparators } from './types';

const defaultComparator = <T>(a: T, b: T) => a === b;

export const getInitialValuesFromComparators = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  comparatorKeys: Array<keyof StateType>
) => {
  const initialValues: Partial<StateType> = {};
  for (const key of comparatorKeys) {
    const comparatorSubject = comparators[key][0]; // 0th element of tuple is the subject
    initialValues[key] = comparatorSubject?.value;
  }
  return initialValues;
};

export const runComparators = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  comparatorKeys: Array<keyof StateType>,
  lastSavedState: StateType | undefined,
  latestState: Partial<StateType>
) => {
  if (!lastSavedState) {
    // if we have no last saved state, everything is considered a change
    return latestState;
  }
  const latestChanges: Partial<StateType> = {};
  for (const key of comparatorKeys) {
    const customComparator = comparators[key]?.[2]; // 2nd element of the tuple is the custom comparator
    const comparator = customComparator ?? defaultComparator;
    if (!comparator(lastSavedState?.[key], latestState[key], lastSavedState, latestState)) {
      latestChanges[key] = latestState[key];
    }
  }
  return Object.keys(latestChanges).length > 0 ? latestChanges : undefined;
};
