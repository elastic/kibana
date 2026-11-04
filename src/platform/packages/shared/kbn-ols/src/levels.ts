/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_LEVELS, type AclLevel } from './types';

/**
 * Compares two levels: a negative number when `a` is lower, zero when equal, positive when higher.
 */
export const compareLevels = (a: AclLevel, b: AclLevel) =>
  ACL_LEVELS.indexOf(a) - ACL_LEVELS.indexOf(b);

export const maxLevel = (a: AclLevel, b: AclLevel) => (compareLevels(a, b) >= 0 ? a : b);

/**
 * Returns the lowest of the stored values that the type allows, ignoring every other value. A
 * component with several values must never grant more than its most restrictive allowed value.
 */
export const lowestAllowed = <T extends AclLevel>(
  values: readonly string[],
  allowed: readonly T[]
): T | undefined => {
  let lowest: T | undefined;
  for (const value of values) {
    const level = allowed.find((allowedLevel) => allowedLevel === value);
    if (level && (lowest === undefined || compareLevels(level, lowest) < 0)) {
      lowest = level;
    }
  }
  return lowest;
};

/**
 * Splits the allowed levels into those that reach `level` and those that do not.
 */
export const partitionLevels = <T extends AclLevel>(allowed: readonly T[], level: AclLevel) => ({
  atLeast: allowed.filter((value) => compareLevels(value, level) >= 0),
  below: allowed.filter((value) => compareLevels(value, level) < 0),
});
