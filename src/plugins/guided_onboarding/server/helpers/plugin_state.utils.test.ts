/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { calculateIsActivePeriod } from './plugin_state.utils';

describe('calculateIsActivePeriod', () => {
  let result: boolean;
  it('returns false if creationDate is undefined', () => {
    result = calculateIsActivePeriod(undefined);
    expect(result).toBe(false);
  });

  it('returns false if after the active period (35d from creation date)', () => {
    // currently active period is 30 days long after the creation date
    const duration35DaysInMilliseconds = 35 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const creationDate35DaysAgo = new Date(now.getTime() - duration35DaysInMilliseconds);
    result = calculateIsActivePeriod(creationDate35DaysAgo.toISOString());
    expect(result).toBe(false);
  });

  it('returns true if in the active period (15d from creation date)', () => {
    // currently active period is 30 days long after the creation date
    const duration15DaysInMilliseconds = 15 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const creationDate15DaysAgo = new Date(now.getTime() - duration15DaysInMilliseconds);
    result = calculateIsActivePeriod(creationDate15DaysAgo.toISOString());
    expect(result).toBe(true);
  });
});
