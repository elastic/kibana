/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';
import { queryHasStatsCommand } from './trendline_query';
import { flattenForkCommands } from './fork';

const flatten = (esqlQuery: string, metricFields?: string[]): string => {
  const { root } = Parser.parse(esqlQuery);
  flattenForkCommands(root.commands, metricFields);
  return BasicPrettyPrinter.print(root);
};

// FORK rewrite shapes are covered by the shared case matrix from
// @kbn/lens-test-helpers (see trendline_query_cases.test.ts); this file keeps
// FORK-aware detection behaviors the matrix does not exercise.
describe('queryHasStatsCommand', () => {
  it('returns true for a top-level STATS command', () => {
    expect(queryHasStatsCommand('FROM index | STATS COUNT(*)')).toBe(true);
  });

  it('returns false when the query has no STATS', () => {
    expect(queryHasStatsCommand('FROM index | KEEP bytes')).toBe(false);
  });

  it('returns true for STATS nested inside a FORK branch', () => {
    expect(
      queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (STATS total = SUM(bytes))')
    ).toBe(true);
  });

  it('returns false for FORK without any STATS branch', () => {
    expect(queryHasStatsCommand('FROM index | FORK (WHERE bytes > 0) (LIMIT 5)')).toBe(false);
  });

  it('returns true for STATS nested inside a FORK within a FORK branch', () => {
    expect(
      queryHasStatsCommand(
        'FROM index | FORK (FORK (STATS total = COUNT(*)) (WHERE bytes > 0)) (LIMIT 5)'
      )
    ).toBe(true);
  });
});

describe('flattenForkCommands', () => {
  it('selects a non-STATS branch whose KEEP projection carries the raw metric field', () => {
    expect(
      flatten('FROM index | FORK (WHERE bytes > 0 | KEEP bytes) (STATS total = COUNT(*))', [
        'bytes',
      ])
    ).toBe('FROM index | WHERE bytes > 0 | KEEP bytes');
  });

  it('selects a branch by an EVAL-derived metric column', () => {
    expect(
      flatten('FROM index | FORK (STATS a = COUNT(*) | EVAL t = a * 2) (STATS b = COUNT(*))', ['t'])
    ).toBe('FROM index | STATS a = COUNT(*) | EVAL t = a * 2');
  });

  // primary-first branch priority is covered end-to-end by the shared case
  // matrix ('FORK query with primary and secondary metrics from different
  // branches'); this pins the fallback ordering, which is not executable there
  it('falls back to lower-priority metric fields when no branch produces the first', () => {
    expect(
      flatten('FROM index | FORK (STATS `Averagee` = AVG(bytes)) (STATS `Event Count` = COUNT())', [
        'missing',
        'Averagee',
      ])
      // pretty printer unquotes backtick idents that need no quoting
    ).toBe('FROM index | STATS Averagee = AVG(bytes)');
  });

  it('flattens a FORK nested inside a FORK branch', () => {
    expect(
      flatten('FROM index | FORK (FORK (STATS total = COUNT(*)) (WHERE bytes > 0)) (LIMIT 5)', [
        'total',
      ])
    ).toBe('FROM index | STATS total = COUNT(*)');
  });

  describe('_fork discriminator cleanup', () => {
    it('removes a RENAME pair involving _fork and drops the emptied RENAME', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | RENAME _fork AS branch',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*)');
    });

    it('keeps unrelated RENAME pairs when removing a _fork pair', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | RENAME _fork AS branch, a AS total',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | RENAME a AS total');
    });

    it('removes a _fork entry from DROP', () => {
      expect(
        flatten('FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | DROP _fork, a', [
          'a',
        ])
      ).toBe('FROM index | STATS a = COUNT(*) | DROP a');
    });

    it('keeps the non-_fork conjunct of a compound WHERE', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | WHERE _fork == "fork1" AND a > 100',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | WHERE a > 100');
    });

    it('keeps all non-_fork conjuncts of a nested AND WHERE', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | WHERE a > 100 AND _fork == "fork1" AND a < 500',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | WHERE a > 100 AND a < 500');
    });

    it('drops the whole WHERE when _fork appears under OR', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | WHERE _fork == "fork1" OR a > 100',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*)');
    });

    it('drops an EVAL assignment referencing the _fork discriminator', () => {
      expect(
        flatten('FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | EVAL x = _fork', [
          'a',
        ])
      ).toBe('FROM index | STATS a = COUNT(*)');
    });
  });

  describe('out-of-scope column cleanup', () => {
    it('cascades: dropping an EVAL referencing a discarded-branch column removes its result from later KEEP', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | EVAL diff = a - b | KEEP a, b, diff',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | KEEP a');
    });

    it('keeps chained EVAL assignments referencing an earlier assignment in the same EVAL', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | EVAL x = a + 1, y = x + 1 | KEEP a, x, y',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | EVAL x = a + 1, y = x + 1 | KEEP a, x, y');
    });

    it('cascades within a chained EVAL when the first assignment is out of scope', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | EVAL x = b + 1, y = x + 1 | KEEP a, x, y',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | KEEP a');
    });

    it('keeps EVAL assignments whose references are all in scope', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | EVAL x = a + 1, y = b + 1',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | EVAL x = a + 1');
    });

    it('drops a SORT entry referencing a discarded-branch column', () => {
      expect(
        flatten('FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | SORT b DESC, a', [
          'a',
        ])
      ).toBe('FROM index | STATS a = COUNT(*) | SORT a');
    });

    it('prunes a WHERE conjunct referencing a discarded-branch column', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | WHERE a > 100 AND b > 0',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | WHERE a > 100');
    });

    it('drops a RENAME pair whose source is a discarded-branch column', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*)) (STATS b = COUNT(*)) | RENAME b AS other, a AS total',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) | RENAME a AS total');
    });

    it('stops strict pruning after an unknown command that may introduce columns', () => {
      expect(
        flatten(
          'FROM index | FORK (STATS a = COUNT(*) BY message) (STATS b = COUNT(*)) | DISSECT message "%{x}" | KEEP a, x',
          ['a']
        )
      ).toBe('FROM index | STATS a = COUNT(*) BY message | DISSECT message "%{x}" | KEEP a, x');
    });

    it('does not prune references to source fields when no branch has STATS (open scope)', () => {
      expect(
        flatten('FROM index | FORK (WHERE bytes > 0) (WHERE bytes < 0) | EVAL kb = bytes / 1024', [
          'bytes',
        ])
      ).toBe('FROM index | WHERE bytes > 0 | EVAL kb = bytes / 1024');
    });
  });
});
