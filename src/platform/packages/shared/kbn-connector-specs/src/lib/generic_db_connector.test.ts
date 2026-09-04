/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertReadOnly,
  BIGQUERY_READ_ONLY_PREFIXES,
  escapeLikePattern,
  isReadOnlySql,
  READ_ONLY_STATEMENT_PREFIXES,
  SELECT_OR_WITH_PREFIX,
} from './generic_db_connector';

describe('isReadOnlySql', () => {
  describe('default prefixes (SELECT, WITH, SHOW, DESCRIBE, DESC, EXPLAIN)', () => {
    const allowed: Array<[string, string]> = [
      ['SELECT', 'SELECT * FROM users LIMIT 10'],
      ['SHOW', 'SHOW TABLES'],
      ['DESCRIBE', 'DESCRIBE users'],
      ['DESC', 'DESC users'],
      ['EXPLAIN', 'EXPLAIN SELECT * FROM users'],
      ['WITH', 'WITH recent AS (SELECT * FROM orders) SELECT * FROM recent'],
      ['lowercase select', 'select * from users'],
      ['leading whitespace', '   SELECT 1'],
      ['line comment', '-- a note\nSELECT 1'],
      ['hash comment', '# a note\nSELECT 1'],
      ['block comment', '/* a note */ SELECT 1'],
      ['mixed comments', '-- one\n/* two */\n  select 1'],
      ['trailing semicolon', 'SELECT 1;'],
      ['trailing semicolon + comment', 'SELECT 1; -- done'],
    ];

    it.each(allowed)('allows %s', (_label, sql) => {
      expect(isReadOnlySql(sql)).toBe(true);
    });
  });

  describe('rejected statements', () => {
    const rejected: Array<[string, string]> = [
      ['INSERT', 'INSERT INTO users VALUES (1)'],
      ['UPDATE', 'UPDATE users SET name = "x"'],
      ['DELETE', 'DELETE FROM users'],
      ['CREATE', 'CREATE TABLE t(id INT)'],
      ['DROP', 'DROP TABLE users'],
      ['ALTER', 'ALTER TABLE users ADD COLUMN c INT'],
      ['TRUNCATE', 'TRUNCATE TABLE users'],
      ['GRANT', 'GRANT SELECT ON users TO reader'],
      ['REVOKE', 'REVOKE SELECT ON users FROM reader'],
      ['CALL', 'CALL my_procedure()'],
      ['MERGE', 'MERGE INTO t USING s ON t.id = s.id WHEN MATCHED THEN UPDATE SET a = 1'],
      ['blank', ''],
      ['leading whitespace write', '   INSERT INTO users VALUES (1)'],
      ['comment-hidden write', '-- looks fine\nINSERT INTO users VALUES (1)'],
      ['block-comment-hidden write', '/* SELECT */ DROP TABLE users'],
      ['WITH + INSERT', 'WITH x AS (INSERT INTO users VALUES (1)) SELECT * FROM x'],
      ['WITH + CREATE', 'WITH t AS (SELECT 1) CREATE TABLE foo (id INT)'],
      ['WITH + DROP', 'WITH t AS (SELECT 1) DROP TABLE users'],
      ['SELECT INTO OUTFILE', "SELECT * FROM users INTO OUTFILE '/tmp/x'"],
      ['multi-statement', 'SELECT 1; DROP TABLE users'],
      ['executable comment bypass', '/*!11111 DELETE FROM users -- */ SELECT 1'],
      ['executable comment no version', '/*! DROP TABLE users */ SELECT 1'],
      ['UPDATE schema-qualified table', 'WITH x AS (SELECT 1) UPDATE mydb.users SET is_admin = 1'],
      ['UPDATE backtick-quoted table', 'WITH x AS (SELECT 1) UPDATE `users` SET admin = 1'],
    ];

    it.each(rejected)('rejects %s', (_label, sql) => {
      expect(isReadOnlySql(sql)).toBe(false);
    });
  });

  it('restricts BigQuery to SELECT, WITH, and EXPLAIN', () => {
    expect(isReadOnlySql('EXPLAIN SELECT 1', BIGQUERY_READ_ONLY_PREFIXES)).toBe(true);
    expect(isReadOnlySql('SHOW TABLES', BIGQUERY_READ_ONLY_PREFIXES)).toBe(false);
    expect(isReadOnlySql('DESCRIBE users', BIGQUERY_READ_ONLY_PREFIXES)).toBe(false);
  });

  it('restricts SELECT/WITH-only callers (MySQL query)', () => {
    expect(isReadOnlySql('SELECT 1', SELECT_OR_WITH_PREFIX)).toBe(true);
    expect(isReadOnlySql('WITH x AS (SELECT 1) SELECT * FROM x', SELECT_OR_WITH_PREFIX)).toBe(true);
    expect(isReadOnlySql('SHOW TABLES', SELECT_OR_WITH_PREFIX)).toBe(false);
    expect(isReadOnlySql('DESCRIBE users', SELECT_OR_WITH_PREFIX)).toBe(false);
    expect(isReadOnlySql('EXPLAIN SELECT 1', SELECT_OR_WITH_PREFIX)).toBe(false);
  });
});

describe('assertReadOnly', () => {
  it('allows SELECT and WITH by default', () => {
    expect(() => assertReadOnly('SELECT * FROM users')).not.toThrow();
    expect(() =>
      assertReadOnly('WITH recent AS (SELECT * FROM orders) SELECT * FROM recent')
    ).not.toThrow();
  });

  it('rejects SHOW / DESCRIBE so query does not wrap them in a subquery', () => {
    expect(() => assertReadOnly('SHOW TABLES')).toThrow(/read-only/i);
    expect(() => assertReadOnly('DESCRIBE users')).toThrow(/read-only/i);
  });

  it('rejects a write statement', () => {
    expect(() => assertReadOnly('DROP TABLE users')).toThrow(/read-only/i);
  });

  it('rejects multi-statement input even when the first statement is read-only', () => {
    expect(() => assertReadOnly('SELECT 1; DROP TABLE users')).toThrow(/multi-statement/i);
  });

  it('rejects a write smuggled inside a WITH CTE', () => {
    expect(() =>
      assertReadOnly('WITH x AS (INSERT INTO users VALUES (1)) SELECT * FROM x')
    ).toThrow(/write operations/i);
  });

  it('rejects a write hidden behind leading comments', () => {
    expect(() => assertReadOnly('-- looks fine\nDROP TABLE users')).toThrow(/read-only/i);
  });

  it('rejects MySQL executable comments that would smuggle a write past the guard', () => {
    expect(() => assertReadOnly('/*!11111 DELETE FROM users -- */ SELECT 1')).toThrow(
      /executable comment/i
    );
    expect(() => assertReadOnly('/*! DROP TABLE users */ SELECT 1')).toThrow(/executable comment/i);
  });

  it('can use the broader discovery prefix set', () => {
    expect(() => assertReadOnly('SHOW TABLES', READ_ONLY_STATEMENT_PREFIXES)).not.toThrow();
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
    const result = escapeLikePattern('_');
    expect(result).toBe('!_');
  });
});
