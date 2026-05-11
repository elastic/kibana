/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectWhereClauseAfterSourceCommand } from './inject_where_after_source';

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
