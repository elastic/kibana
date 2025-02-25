/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asDuration, toMicroseconds } from './duration';

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

  describe('toMicroseconds', () => {
    it('transformes to microseconds', () => {
      expect(toMicroseconds(1, 'hours')).toEqual(3600000000);
      expect(toMicroseconds(10, 'minutes')).toEqual(600000000);
      expect(toMicroseconds(10, 'seconds')).toEqual(10000000);
      expect(toMicroseconds(10, 'milliseconds')).toEqual(10000);
    });
  });
});
