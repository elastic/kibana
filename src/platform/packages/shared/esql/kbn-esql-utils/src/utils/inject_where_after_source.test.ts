/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  injectWhereClauseAfterSourceCommand,
  injectWhereClauseBeforeTrailingSortAndLimit,
} from './inject_where_after_source';

describe('injectWhereClauseAfterSourceCommand', () => {
  it('injects a WHERE clause right after a FROM command', () => {
    expect(injectWhereClauseAfterSourceCommand('FROM logs', '`host.name` : "web-1"')).toBe(
      'FROM logs\n| WHERE `host.name` : "web-1"'
    );
  });

  it('injects before transformational commands so the filter applies pre-aggregation', () => {
    expect(
      injectWhereClauseAfterSourceCommand(
        'FROM logs | STATS count = COUNT(*) BY host',
        '`host.name` : "web-1"'
      )
    ).toBe('FROM logs\n| WHERE `host.name` : "web-1" | STATS count = COUNT(*) BY host');
  });

  it('injects before an existing WHERE so both filters are kept', () => {
    expect(
      injectWhereClauseAfterSourceCommand('FROM logs | WHERE level == "error"', 'host : "web-1"')
    ).toBe('FROM logs\n| WHERE host : "web-1" | WHERE level == "error"');
  });

  it('keeps METADATA in the source command and injects after it', () => {
    expect(
      injectWhereClauseAfterSourceCommand('FROM logs METADATA _id | KEEP _id', 'host : "web-1"')
    ).toBe('FROM logs METADATA _id\n| WHERE host : "web-1" | KEEP _id');
  });

  it('handles a TS source command', () => {
    expect(injectWhereClauseAfterSourceCommand('TS metrics-*', 'host : "web-1"')).toBe(
      'TS metrics-*\n| WHERE host : "web-1"'
    );
  });

  it('keeps the query valid when the source line ends with a line comment', () => {
    // The source command location stops before the trailing `//` comment, so the
    // comment shifts onto the WHERE line. ES|QL treats `//` as a line comment, so the
    // injected WHERE still parses cleanly.
    expect(
      injectWhereClauseAfterSourceCommand('FROM logs // a comment\n| STATS count()', 'x > 0')
    ).toBe('FROM logs\n| WHERE x > 0 // a comment\n| STATS count()');
  });

  it('returns the query unchanged for an empty WHERE expression', () => {
    expect(injectWhereClauseAfterSourceCommand('FROM logs', '')).toBe('FROM logs');
    expect(injectWhereClauseAfterSourceCommand('FROM logs', '   ')).toBe('FROM logs');
  });

  it('returns the query unchanged when the first command is not a source command', () => {
    expect(injectWhereClauseAfterSourceCommand('| WHERE x > 0', 'host : "web-1"')).toBe(
      '| WHERE x > 0'
    );
  });
});

describe('injectWhereClauseBeforeTrailingSortAndLimit', () => {
  it('injects the WHERE at the end of a query that does not end with SORT or LIMIT', () => {
    expect(
      injectWhereClauseBeforeTrailingSortAndLimit(
        'FROM logs | STATS c = COUNT(*) BY size',
        'size == "big"'
      )
    ).toBe('FROM logs | STATS c = COUNT(*) BY size\n| WHERE size == "big"');
  });

  it('injects before the SORT and LIMIT that end the query, so they apply to the filtered rows', () => {
    expect(
      injectWhereClauseBeforeTrailingSortAndLimit(
        'FROM logs | STATS c = COUNT(*) BY size | SORT c DESC | LIMIT 10',
        'size == "big"'
      )
    ).toBe(
      'FROM logs | STATS c = COUNT(*) BY size\n| WHERE size == "big" | SORT c DESC | LIMIT 10'
    );
    expect(
      injectWhereClauseBeforeTrailingSortAndLimit(
        'FROM logs | EVAL size = 1 | LIMIT 100',
        'size == 1'
      )
    ).toBe('FROM logs | EVAL size = 1\n| WHERE size == 1 | LIMIT 100');
  });

  it('does not skip a LIMIT that is followed by other commands', () => {
    expect(
      injectWhereClauseBeforeTrailingSortAndLimit(
        'FROM logs | LIMIT 10 | EVAL size = 1 | SORT size',
        'size == 1'
      )
    ).toBe('FROM logs | LIMIT 10 | EVAL size = 1\n| WHERE size == 1 | SORT size');
  });

  it('keeps the query valid when the last command line ends with a comment', () => {
    expect(
      injectWhereClauseBeforeTrailingSortAndLimit(
        'FROM logs | EVAL a = 1 // a comment\n| LIMIT 5',
        'a == 1'
      )
    ).toBe('FROM logs | EVAL a = 1\n| WHERE a == 1 // a comment\n| LIMIT 5');
  });

  it('returns the query unchanged for an empty WHERE expression', () => {
    expect(injectWhereClauseBeforeTrailingSortAndLimit('FROM logs | LIMIT 5', ' ')).toBe(
      'FROM logs | LIMIT 5'
    );
  });
});
