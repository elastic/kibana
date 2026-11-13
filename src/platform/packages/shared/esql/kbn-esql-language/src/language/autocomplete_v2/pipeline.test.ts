/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { locate } from '../../esql_js_sim/grammar';
import { getQueryBeforeCursor } from './pipeline';

const queryBefore = (text: string): string => getQueryBeforeCursor(text, locate(text, text.length));

describe('getQueryBeforeCursor', () => {
  it.each([
    ['FROM ', ''],
    ['FROM a | ', 'FROM a'],
    ['FROM a | KEEP ', 'FROM a'],
    ['FROM a | KEEP b', 'FROM a'],
    ['FROM a | EVAL x = 1 | WHERE ', 'FROM a | EVAL x = 1'],
    ['FROM a | EVAL x = 1 | WHERE x > 0 AND ', 'FROM a | EVAL x = 1'],
  ])('%j reads the result of %j', (text, expected) => {
    expect(queryBefore(text)).toBe(expected);
  });

  it('keeps the header statements', () => {
    expect(queryBefore('SET a = 1; FROM b | KEEP ')).toBe('SET a = 1; FROM b');
  });

  describe('in a branch', () => {
    it('continues the pipeline the branch is in', () => {
      expect(queryBefore('FROM a | EVAL x = 1 | FORK (WHERE ')).toBe('FROM a | EVAL x = 1');
      expect(queryBefore('FROM a | EVAL x = 1 | FORK (WHERE y | KEEP ')).toBe(
        'FROM a | EVAL x = 1 | WHERE y'
      );
    });

    it('leaves the other branches out', () => {
      expect(queryBefore('FROM a | FORK (WHERE y) (EVAL z = 1 | KEEP ')).toBe(
        'FROM a | EVAL z = 1'
      );
    });

    it('is the pipeline so far where a command of the branch starts', () => {
      expect(queryBefore('FROM a | FORK (')).toBe('FROM a');
      expect(queryBefore('FROM a | FORK (WHERE y | ')).toBe('FROM a | WHERE y');
    });
  });

  describe('in a subquery', () => {
    it('reads only the subquery, which has its own source', () => {
      expect(queryBefore('FROM a, (FROM b | WHERE ')).toBe('FROM b');
      expect(queryBefore('FROM a | WHERE c IN (FROM b | EVAL d = 1 | KEEP ')).toBe(
        'FROM b | EVAL d = 1'
      );
    });
  });
});
