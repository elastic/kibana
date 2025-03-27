/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StateComparators } from './types';

const referenceEquality = <T>(a: T, b: T) => a === b;

export const areComparatorsEqual = <StateType extends object = object>(
  comparators: StateComparators<StateType>,
  lastSavedState?: StateType,
  latestState?: StateType
): boolean => {
  return Object.keys(comparators).every((key) => {
    const comparator = comparators[key as keyof StateType];
    const last = lastSavedState?.[key as keyof StateType];
    const current = latestState?.[key as keyof StateType];

    if (comparator === 'referenceEquality') return referenceEquality(last, current);
    return comparator(last, current, lastSavedState, latestState);
  });
};
