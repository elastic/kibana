/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertReadOnly, escapeLikePattern } from './generic_db_connector';

describe('assertReadOnly', () => {
  const allowedStatements = [
    ['SELECT', 'SELECT * FROM users LIMIT 10'],
    ['SHOW', 'SHOW TABLES'],
    ['DESCRIBE', 'DESCRIBE users'],
    ['DESC', 'DESC users'],
    ['EXPLAIN', 'EXPLAIN SELECT * FROM users'],
    ['WITH', 'WITH recent AS (SELECT * FROM orders) SELECT * FROM recent'],
    ['lowercase select', 'select * from users'],
  ];

  it.each(allowedStatements)('allows %s statements', (_label, sql) => {
    expect(() => assertReadOnly(sql)).not.toThrow();
  });

  const rejectedStatements = [
    ['INSERT', 'INSERT INTO users VALUES (1)'],
    ['UPDATE', 'UPDATE users SET name = "x"'],
    ['DELETE', 'DELETE FROM users'],
    ['CREATE', 'CREATE TABLE t(id INT)'],
    ['DROP', 'DROP TABLE users'],
    ['ALTER', 'ALTER TABLE users ADD COLUMN c INT'],
    ['TRUNCATE', 'TRUNCATE TABLE users'],
    ['GRANT', 'GRANT SELECT ON users TO reader'],
    ['blank', ''],
    ['leading whitespace write', '   INSERT INTO users VALUES (1)'],
  ];

  it.each(rejectedStatements)('rejects %s statements', (_label, sql) => {
    expect(() => assertReadOnly(sql)).toThrow(/read-only/i);
  });

  it('rejects multi-statement input even when the first statement is read-only', () => {
    expect(() => assertReadOnly('SELECT 1; DROP TABLE users')).toThrow(/multi-statement/i);
  });

  it('rejects a write statement smuggled inside a WITH CTE', () => {
    expect(() =>
      assertReadOnly('WITH x AS (INSERT INTO users VALUES (1)) SELECT * FROM x')
    ).toThrow(/write operations/i);
  });

  it('allows a WITH statement that only reads', () => {
    expect(() =>
      assertReadOnly('WITH recent AS (SELECT * FROM orders) SELECT * FROM recent')
    ).not.toThrow();
  });
});

describe('escapeLikePattern', () => {
  it('escapes percent and underscore wildcards', () => {
    expect(escapeLikePattern('50%_off')).toBe('50!%!_off');
  });

  it('escapes the escape character itself first', () => {
    expect(escapeLikePattern('a!b')).toBe('a!!b');
  });

  it('escapes single quotes by default for text-protocol SQL string literals', () => {
    expect(escapeLikePattern("o'brien")).toBe("o''brien");
  });

  it('leaves single quotes unmodified when escapeSingleQuotes is false', () => {
    expect(escapeLikePattern("o'brien", false)).toBe("o'brien");
  });

  it('leaves plain text untouched', () => {
    expect(escapeLikePattern('hello world')).toBe('hello world');
  });

  it('does not let escaping introduce a fresh wildcard', () => {
    // '_' preceded by the escape char must stay a literal underscore, not be
    // re-interpreted as an escape sequence for something else.
    const result = escapeLikePattern('_');
    expect(result).toBe('!_');
  });
});
