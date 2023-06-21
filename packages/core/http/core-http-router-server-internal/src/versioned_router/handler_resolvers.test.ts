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
      { versions: ['2002-02-02', '2022-02-02', '2021-02-02'], expected: '2002-02-02' },
      { versions: ['abc', 'def', 'ghi'], expected: 'abc' },
      { versions: ['1', '2', '400'], expected: '1' },
      { versions: ['2002-02-02'], expected: '2002-02-02' },
      { versions: [], expected: undefined },
    ])(`$versions returns $expected`, ({ versions, expected }) => {
      expect(resolvers.oldest(versions)).toBe(expected);
    });
  });

  describe('newest', () => {
    test.each([
      { versions: ['2002-02-02', '2022-02-02', '2021-02-02'], expected: '2022-02-02' },
      { versions: ['abc', 'def', 'ghi'], expected: 'ghi' },
      { versions: ['1', '2', '400'], expected: '400' },
      { versions: ['2002-02-02'], expected: '2002-02-02' },
      { versions: [], expected: undefined },
    ])(`$versions returns $expected`, ({ versions, expected }) => {
      expect(resolvers.newest(versions)).toBe(expected);
    });
  });
});
