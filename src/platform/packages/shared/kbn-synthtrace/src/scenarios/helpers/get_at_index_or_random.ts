/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomInt } from 'crypto';

/**
 * Returns `values[index]` when index is provided, otherwise picks a uniformly random element.
 * Throws if the array is empty to surface programming errors early.
 */
export const getAtIndexOrRandom = <T>(values: T[], index?: number): T => {
  if (values.length === 0) {
    throw new Error('getAtIndexOrRandom called with an empty array');
  }
  return values[index ?? randomInt(values.length)];
};
