/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { parseScheduleDates } from '.';

describe('parseScheduleDates', () => {
  test('it returns a moment when given an ISO string', () => {
    const result = parseScheduleDates('2020-01-01T00:00:00.000Z');
    expect(result).not.toBeNull();
    expect(result).toEqual(moment('2020-01-01T00:00:00.000Z'));
  });

  test('it returns a moment when given `now`', () => {
    const result = parseScheduleDates('now');

    expect(result).not.toBeNull();
    expect(moment.isMoment(result)).toBeTruthy();
  });

  test('it returns a moment when given `now-x`', () => {
    const result = parseScheduleDates('now-6m');

    expect(result).not.toBeNull();
    expect(moment.isMoment(result)).toBeTruthy();
  });

  test('it returns null when given a string that is not an ISO string, `now` or `now-x`', () => {
    const result = parseScheduleDates('invalid');

    expect(result).toBeNull();
  });
});
