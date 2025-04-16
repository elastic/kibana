/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildPartialMatcher, getOverlapRange } from './helper';

describe('getOverlapRange', () => {
  it('should return the overlap range', () => {
    expect(getOverlapRange('IS N', 'IS NOT NULL')).toEqual({ start: 0, end: 4 });
    expect(getOverlapRange('I', 'IS NOT NULL')).toEqual({ start: 0, end: 1 });
    expect(getOverlapRange('j', 'IS NOT NULL')).toBeUndefined();
  });

  it('full query', () => {
    expect(getOverlapRange('FROM index | WHERE field IS N', 'IS NOT NULL')).toEqual({
      start: 25,
      end: 29,
    });
  });
});

describe('buildPartialMatcher', () => {
  it('should build a partial matcher', () => {
    const str = 'is NoT nulL';
    const matcher = buildPartialMatcher(str);

    for (let i = 0; i < str.length; i++) {
      expect(matcher.test(str.slice(0, i + 1))).toEqual(true);
    }

    expect(matcher.test('not')).toEqual(false);
    expect(matcher.test('is null')).toEqual(false);
    expect(matcher.test('is not nullz')).toEqual(false);
  });
});
