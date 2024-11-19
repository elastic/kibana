/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { offsetTime } from './offset_time';

describe('offsetTime(req, by)', () => {
  test('should return a moment object for to and from', () => {
    const req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-01T00:00:00Z').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-01T01:00:00Z').isSame(to)).toBeTruthy();
  });

  test('should return a moment object for to and from offset by 1 hour', () => {
    const req = {
      body: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '1h');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-01T00:00:00Z').subtract(1, 'h').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-01T01:00:00Z').subtract(1, 'h').isSame(to)).toBeTruthy();
  });

  test('should return a moment object for to and from offset by -2 minute', () => {
    const req = {
      body: {
        timerange: {
          min: '2017-01-10T01:00:00Z',
          max: '2017-01-10T02:00:00Z',
        },
      },
    };
    const { from, to } = offsetTime(req, '-2m');
    expect(moment.isMoment(from)).toBeTruthy();
    expect(moment.isMoment(to)).toBeTruthy();
    expect(moment.utc('2017-01-10T01:02:00Z').isSame(from)).toBeTruthy();
    expect(moment.utc('2017-01-10T02:02:00Z').isSame(to)).toBeTruthy();
  });

  test('should work when prefixing positive offsets with the plus sign', () => {
    const req = {
      body: {
        timerange: {
          min: '2017-01-10T01:00:00Z',
          max: '2017-01-10T02:00:00Z',
        },
      },
    };
    const { from: fromSigned, to: toSigned } = offsetTime(req, '+1m');
    const { from, to } = offsetTime(req, '1m');

    expect(fromSigned.isSame(from)).toBeTruthy();
    expect(toSigned.isSame(to)).toBeTruthy();
  });
});
