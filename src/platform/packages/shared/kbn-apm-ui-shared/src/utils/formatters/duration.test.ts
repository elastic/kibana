/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asDuration, asMillisecondDuration, asTransactionRate, toMicroseconds } from './duration';

describe('duration formatters', () => {
  describe('asDuration', () => {
    it('formats correctly with defaults', () => {
      expect(asDuration(null)).toEqual('N/A');
      expect(asDuration(undefined)).toEqual('N/A');
      expect(asDuration(0)).toEqual('0 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(1)).toEqual('1 μs');
      expect(asDuration(toMicroseconds(1, 'milliseconds'))).toEqual('1,000 μs');
      expect(asDuration(toMicroseconds(1000, 'milliseconds'))).toEqual('1,000 ms');
      expect(asDuration(toMicroseconds(10000, 'milliseconds'))).toEqual('10,000 ms');
      expect(asDuration(toMicroseconds(20, 'seconds'))).toEqual('20 s');
      expect(asDuration(toMicroseconds(10, 'minutes'))).toEqual('600 s');
      expect(asDuration(toMicroseconds(11, 'minutes'))).toEqual('11 min');
      expect(asDuration(toMicroseconds(1, 'hours'))).toEqual('60 min');
      expect(asDuration(toMicroseconds(1.5, 'hours'))).toEqual('90 min');
      expect(asDuration(toMicroseconds(10, 'hours'))).toEqual('600 min');
      expect(asDuration(toMicroseconds(11, 'hours'))).toEqual('11 h');
    });

    it('falls back to default value', () => {
      expect(asDuration(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });

  describe('asMillisecondDuration', () => {
    it('returns N/A for null and undefined', () => {
      expect(asMillisecondDuration(null)).toEqual('N/A');
      expect(asMillisecondDuration(undefined)).toEqual('N/A');
    });

    it('formats zero', () => {
      expect(asMillisecondDuration(0)).toEqual('0 ms');
    });

    it('formats sub-10ms values as decimals', () => {
      expect(asMillisecondDuration(1500)).toEqual('1.5 ms');
    });

    it('formats large values as integers', () => {
      expect(asMillisecondDuration(1200000)).toEqual('1,200 ms');
    });
  });

  describe('asTransactionRate', () => {
    it('returns N/A for null, undefined, and non-finite values', () => {
      expect(asTransactionRate(null)).toEqual('N/A');
      expect(asTransactionRate(undefined)).toEqual('N/A');
      expect(asTransactionRate(Infinity)).toEqual('N/A');
    });

    it('formats zero', () => {
      expect(asTransactionRate(0)).toEqual('0 tpm');
    });

    it('formats values at or below 0.1 as "< 0.1 tpm"', () => {
      expect(asTransactionRate(0.05)).toEqual('< 0.1 tpm');
      expect(asTransactionRate(0.1)).toEqual('< 0.1 tpm');
    });

    it('formats decimal values above 0.1', () => {
      expect(asTransactionRate(1.5)).toEqual('1.5 tpm');
    });

    it('formats integer values', () => {
      expect(asTransactionRate(42)).toEqual('42 tpm');
    });
  });

  describe('toMicroseconds', () => {
    it('transformes to microseconds', () => {
      expect(toMicroseconds(1, 'hours')).toEqual(3600000000);
      expect(toMicroseconds(10, 'minutes')).toEqual(600000000);
      expect(toMicroseconds(10, 'seconds')).toEqual(10000000);
      expect(toMicroseconds(10, 'milliseconds')).toEqual(10000);
    });
  });
});
