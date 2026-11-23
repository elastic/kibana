/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { blankNonCode, toReadOnlyQuery } from './sql_guard';

describe('blankNonCode', () => {
  it('keeps the length and the line breaks', () => {
    const sql = "SELECT 'a\nb' -- c\nFROM t";
    const blanked = blankNonCode(sql);
    expect(blanked).toHaveLength(sql.length);
    expect(blanked.split('\n')).toHaveLength(sql.split('\n').length);
  });

  it.each([
    ['a line comment', 'SELECT 1 -- DROP TABLE t', 'DROP'],
    ['a block comment', 'SELECT 1 /* DROP TABLE t */', 'DROP'],
    ['a nested block comment', 'SELECT 1 /* a /* b */ DROP */', 'DROP'],
    ['a string literal', "SELECT 'DROP TABLE t'", 'DROP'],
    ['an escaped quote', "SELECT 'it''s; DROP TABLE t'", 'DROP'],
    ['a backslash-escaped E string', "SELECT E'a\\'; DROP TABLE t'", 'DROP'],
    ['a quoted identifier', 'SELECT "DROP" FROM t', 'DROP'],
    ['a dollar-quoted string', 'SELECT $$; DROP TABLE t$$', 'DROP'],
    ['a tagged dollar-quoted string', 'SELECT $body$; DROP TABLE t$body$', 'DROP'],
  ])('blanks %s', (_label, sql, word) => {
    expect(blankNonCode(sql)).not.toContain(word);
  });

  it('keeps real code', () => {
    expect(blankNonCode("SELECT a FROM t WHERE b = 'x'")).toMatch(
      /^SELECT a FROM t WHERE b = {4}$/
    );
  });

  it('does not treat a plain string as backslash-escaped', () => {
    // In a plain string the backslash is literal, so the quote after it ends the string and DROP is code.
    expect(blankNonCode("SELECT 'a\\'; DROP TABLE t; --'")).toContain('DROP');
  });

  it('treats a $ inside an identifier as part of the identifier', () => {
    expect(blankNonCode('SELECT a$b$ FROM t')).toBe('SELECT a$b$ FROM t');
  });

  it('blanks an unterminated literal to the end of the input', () => {
    expect(blankNonCode("SELECT 'DROP").trim()).toBe('SELECT');
  });
});

describe('toReadOnlyQuery', () => {
  it('wraps the statement with a bound row limit', () => {
    expect(toReadOnlyQuery('SELECT id FROM t')).toBe(
      'SELECT * FROM (\nSELECT id FROM t\n) AS kibana_query LIMIT $1'
    );
  });

  it('drops a trailing semicolon and keeps a trailing comment on its own line', () => {
    expect(toReadOnlyQuery('SELECT 1 AS a; -- done')).toBe(
      'SELECT * FROM (\nSELECT 1 AS a\n) AS kibana_query LIMIT $1'
    );
    expect(toReadOnlyQuery('SELECT 1 -- explain')).toBe(
      'SELECT * FROM (\nSELECT 1 -- explain\n) AS kibana_query LIMIT $1'
    );
  });

  it('accepts WITH queries', () => {
    expect(() => toReadOnlyQuery('WITH x AS (SELECT 1 AS n) SELECT n FROM x')).not.toThrow();
  });

  it.each([
    'INSERT INTO t VALUES (1)',
    'SHOW search_path',
    'WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d',
    'SELECT 1; DELETE FROM t',
    'SELECT 1;/* a /* b */ c */DROP TABLE t',
    'SELECT $$a$$; DROP TABLE t',
    'SELECT 1) AS t; COMMIT; DELETE FROM orders; --',
  ])('rejects %s', (sql) => {
    expect(() => toReadOnlyQuery(sql)).toThrow();
  });

  it.each(['SELECT * FROM t WHERE id = $1', 'SELECT * FROM t WHERE a = $2 OR b = $10'])(
    'rejects the bind placeholder in %s',
    (sql) => {
      expect(() => toReadOnlyQuery(sql)).toThrow('Bind placeholders');
    }
  );

  it.each(["SELECT '$1' AS v", 'SELECT $q$ $1 $q$ AS v', 'SELECT a$1 FROM t', 'SELECT 1 -- $1'])(
    'accepts a $n that is not a placeholder in %s',
    (sql) => {
      expect(() => toReadOnlyQuery(sql)).not.toThrow();
    }
  );
});
