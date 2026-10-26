/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { samplePattern } from './sample_pattern';

describe('samplePattern', () => {
  it.each([
    ['^[0-9a-fA-F]{24}$', 'aaaaaaaaaaaaaaaaaaaaaaaa'],
    ['^\\d{4}-\\d{2}-\\d{2}$', '0000-00-00'],
    ['^(prod|staging)-[a-z]+$', 'prod-a'],
    ['^(?:[A-Z][a-z]*)+\\.?$', 'A'],
    ['^[^0-9]+$', 'a'],
    ['^\\p{Lu}{2}$', 'AA'],
    ['^\\u0041b?c*$', 'A'],
    ['^(?<name>x)(?=y)y$', 'xy'],
    ['abc', 'abc'],
    ['^[\\w.-]+@[\\w-]+\\.[a-z]{2,}$', 'a@a.aa'],
  ])('samples %s', (pattern, expected) => {
    expect(samplePattern(pattern)).toBe(expected);
    expect(new RegExp(pattern, 'u').test(expected)).toBe(true);
  });

  it.each([['^(a)\\1$'], ['^(?<!a)b$x']])(
    'returns undefined for %s, which it cannot sample',
    (pattern) => {
      expect(samplePattern(pattern)).toBeUndefined();
    }
  );
});
