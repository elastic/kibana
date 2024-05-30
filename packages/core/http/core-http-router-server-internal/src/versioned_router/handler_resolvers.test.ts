/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolvers } from './handler_resolvers';

describe('default handler resolvers', () => {
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
    test('throw for non numeric input when access is internal', () => {
      expect(() => resolvers.oldest(['abc'], 'internal')).toThrow(/found non numeric/i);
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

    test('throw for non numeric input when access is internal', () => {
      expect(() => resolvers.newest(['abc'], 'internal')).toThrow(/found non numeric/i);
    });
  });
});
