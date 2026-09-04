/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared read-only SQL guardrail used by MySQL, Snowflake, and BigQuery.
 *
 * Strips leading whitespace and comments (line `--` / `#`, block comments),
 * rejects a second statement after `;`, requires an allowlisted leading keyword, and rejects
 * write / DDL tokens that can follow a read-only prefix (e.g. `WITH … INSERT`,
 * `SELECT … INTO OUTFILE`).
 *
 * The `;` check is conservative: a semicolon inside a string literal is treated
 * as a second statement. Agents can rewrite such queries.
 *
 * MySQL executable comments (/*!...* /) are rejected outright: MySQL parses their
 * contents as code while the guard would otherwise strip them as inert text, allowing
 * a write/DDL to be smuggled past both the prefix check and WRITE_PATTERN.
 */

export const READ_ONLY_STATEMENT_PREFIXES = /^(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;
export const SELECT_OR_WITH_PREFIX = /^(SELECT|WITH)\b/i;
export const BIGQUERY_READ_ONLY_PREFIXES = /^(SELECT|WITH|EXPLAIN)\b/i;

// Write / DDL that can hide after a read-only prefix (WITH CTE, SELECT INTO, EXPLAIN UPDATE).
const WRITE_PATTERN =
  /\b(INSERT\s+INTO|REPLACE\s+INTO|UPDATE\s+|DELETE\s+FROM|MERGE\s+INTO|CREATE\s+|DROP\s+|ALTER\s+|TRUNCATE\s+|GRANT\s+|REVOKE\s+|CALL\s+|LOAD\s+DATA|INTO\s+(OUTFILE|DUMPFILE))/i;

// MySQL executable comments (/*!...*/): MySQL server parses their contents as code,
// but stripLeadingCommentsAndWhitespace would strip them as inert text first, letting
// a write/DDL slip past both the prefix check and WRITE_PATTERN. Reject outright.
const MYSQL_EXECUTABLE_COMMENT = /\/\*!/;

export const stripLeadingCommentsAndWhitespace = (sql: string): string => {
  let remaining = sql;
  while (true) {
    const before = remaining;
    remaining = remaining.replace(/^\s+/, '');
    remaining = remaining.replace(/^--[^\n]*(?:\n|$)/, '');
    remaining = remaining.replace(/^#[^\n]*(?:\n|$)/, '');
    remaining = remaining.replace(/^\/\*[\s\S]*?\*\//, '');
    if (remaining === before) {
      return remaining;
    }
  }
};

export const hasTrailingStatement = (sql: string): boolean => {
  const semicolonIndex = sql.indexOf(';');
  if (semicolonIndex === -1) {
    return false;
  }
  const trailing = stripLeadingCommentsAndWhitespace(sql.slice(semicolonIndex + 1));
  return trailing.length > 0;
};

export const isReadOnlySql = (
  sql: string,
  allowedPrefixes: RegExp = READ_ONLY_STATEMENT_PREFIXES
): boolean => {
  if (MYSQL_EXECUTABLE_COMMENT.test(sql)) return false;
  if (hasTrailingStatement(sql)) return false;
  const head = stripLeadingCommentsAndWhitespace(sql);
  return allowedPrefixes.test(head) && !WRITE_PATTERN.test(head);
};

export const assertReadOnly = (
  sql: string,
  allowedPrefixes: RegExp = SELECT_OR_WITH_PREFIX
): void => {
  if (MYSQL_EXECUTABLE_COMMENT.test(sql)) {
    throw new Error('MySQL executable comments (/*! ... */) are not permitted');
  }
  if (hasTrailingStatement(sql)) {
    throw new Error('Multi-statement SQL is not permitted');
  }
  const head = stripLeadingCommentsAndWhitespace(sql);
  if (!allowedPrefixes.test(head)) {
    throw new Error(
      'Only read-only SQL statements are permitted (SELECT, WITH). Use listTables or describeTable for schema discovery, or executeSql for writes.'
    );
  }
  if (WRITE_PATTERN.test(head)) {
    throw new Error('Write operations are not permitted');
  }
};

// LIKE escape character is '!'. Safe regardless of NO_BACKSLASH_ESCAPES.
// escapeSingleQuotes: true (default) for text-protocol drivers that embed the pattern
// in a SQL string literal; false for prepared-statement drivers (binary protocol).
export const escapeLikePattern = (value: string, escapeSingleQuotes = true): string => {
  let result = value
    .replace(/!/g, '!!') // escape char itself first
    .replace(/%/g, '!%') // literal percent
    .replace(/_/g, '!_'); // literal underscore
  if (escapeSingleQuotes) {
    result = result.replace(/'/g, "''");
  }
  return result;
};
