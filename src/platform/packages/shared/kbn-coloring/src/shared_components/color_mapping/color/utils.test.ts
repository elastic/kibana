/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { getValueKey } from './utils';

describe('Utils', () => {
  describe('getValueKey', () => {
    class WithoutToString {
      value = 'without toString';
    }
    class WithToString {
      value = 'with toString';
      toString() {
        return this.value;
      }
    }

    it.each<[desc: string, rawValue: unknown, expectedKey: string]>([
      ['object', { test: 'test' }, '{"test":"test"}'],
      ['array', [1, 2, 'three'], '1,2,three'],
      ['number', 123, '123'],
      ['string', 'testing', 'testing'],
      ['boolean (false)', false, 'false'],
      ['boolean (true)', true, 'true'],
      ['null', null, '__missing__'],
      ['undefined', undefined, '__missing__'],
      ['class (with toString)', new WithToString(), 'with toString'],
      ['class (without toString)', new WithoutToString(), '{"value":"without toString"}'],
    ])('should return correct key for %s', (_, rawValue, expectedKey) => {
      expect(getValueKey(rawValue)).toBe(expectedKey);
    });
  });
});
