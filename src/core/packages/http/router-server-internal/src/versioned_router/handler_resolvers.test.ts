/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolvers } from './handler_resolvers';

describe('default handler resolvers', () => {
  describe('sort', () => {
    test.each([
      [['1', '10', '2'], 'internal', ['1', '2', '10']],
      [
        ['2023-01-01', '2002-10-10', '2005-01-01'],
        'public',
        ['2002-10-10', '2005-01-01', '2023-01-01'],
      ],
      [[], 'internal', []],
      [[], 'public', []],
    ])('%s, %s returns %s', (input, access, output) => {
      expect(resolvers.sort(input, access as 'internal' | 'public')).toEqual(output);
    });

    test('copy, not mutate', () => {
      const input = ['1', '12', '0'];
      const output = resolvers.sort(input, 'internal');
      expect(output).not.toBe(input);
    });

    test('throw for non numeric input when access is internal', () => {
      expect(() => resolvers.sort(['abc'], 'internal')).toThrow(/found non numeric/i);
    });
  });
  describe('oldest', () => {
    test.each([
      {
        versions: ['2002-02-02', '2022-02-02', '2021-02-02'],
        expected: '2002-02-02',
        access: 'public',
      },
      { versions: ['abc', 'def', 'ghi'], expected: 'abc', access: 'public' },
      { versions: ['1', '2', '400'], expected: '1', access: 'internal' },
      { versions: ['1', '10', '2'], expected: '1', access: 'internal' },
      { versions: ['2002-02-02'], expected: '2002-02-02', access: 'public' },
      { versions: [], expected: undefined, access: 'public' },
    ])(`$versions returns $expected`, ({ versions, expected, access }) => {
      expect(resolvers.oldest(versions, access as 'internal' | 'public')).toBe(expected);
    });
  });

  describe('newest', () => {
    test.each([
      {
        versions: ['2002-02-02', '2022-02-02', '2021-02-02'],
        expected: '2022-02-02',
        access: 'public',
      },
      { versions: ['abc', 'def', 'ghi'], expected: 'ghi', access: 'public' },
      { versions: ['1', '2', '400'], expected: '400', access: 'internal' },
      { versions: ['1', '10', '2'], expected: '10', access: 'internal' },
      { versions: ['2002-02-02'], expected: '2002-02-02', access: 'public' },
      { versions: [], expected: undefined, access: 'public' },
    ])(`$versions returns $expected`, ({ versions, expected, access }) => {
      expect(resolvers.newest(versions, access as 'internal' | 'public')).toBe(expected);
    });
  });
});
