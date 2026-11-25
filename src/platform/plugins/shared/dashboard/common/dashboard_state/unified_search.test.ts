/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { areTimesEqual } from './unified_search';

describe('areTimesEqual', () => {
  it('compares absolute ISO times in UTC', () => {
    expect(areTimesEqual('2024-01-01T01:00:00.000+01:00', '2024-01-01T00:00:00.000Z')).toBe(true);
    expect(areTimesEqual('2024-01-01T00:00:00Z', '2024-01-01T00:00:00.000Z')).toBe(true);
    expect(areTimesEqual('2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z')).toBe(false);
  });

  it('treats undefined as equal only to undefined', () => {
    expect(areTimesEqual(undefined, undefined)).toBe(true);
    expect(areTimesEqual(undefined, 'now')).toBe(false);
    expect(areTimesEqual('2024-01-01T00:00:00.000Z', undefined)).toBe(false);
  });

  it('compares relative times as strings without falling back to Date parsing', () => {
    const { deprecationHandler } = moment;
    const deprecationSpy = jest.fn();
    moment.deprecationHandler = deprecationSpy;

    expect(areTimesEqual('now-7d', 'now-7d')).toBe(true);
    expect(areTimesEqual('now-7d', 'now-15m')).toBe(false);
    expect(deprecationSpy).not.toHaveBeenCalled();

    moment.deprecationHandler = deprecationHandler;
  });
});
