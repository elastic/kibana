/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared utilities for database connectors
 */

// ---------------------------------------------------------------------------
// SQL safety guards
// ---------------------------------------------------------------------------

const READ_ONLY_PREFIX = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i;

/**
 * Enforce read-only SQL (defense-in-depth; the adapter also enforces this
 * independently). Rejects statements that do not start with a known read-only
 * keyword and rejects multi-statement input (semicolons).  This is only a sanity
 * check and the database connector should execute queries in read-only mode where
 * possible.
 */
export const assertReadOnly = (sql: string): void => {
  if (!READ_ONLY_PREFIX.test(sql)) {
    throw new Error(
      'Only read-only SQL statements are permitted (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH)'
    );
  }
  if (sql.includes(';')) {
    throw new Error('Multi-statement SQL is not permitted');
  }
};

/**
 * Escape a value for use inside a MySQL-compatible LIKE pattern using '!' as
 * the escape character. Safe regardless of the server's NO_BACKSLASH_ESCAPES
 * mode.
 *
 * Usage in SQL:  col LIKE '%<escaped>%' ESCAPE '!'
 */
export const escapeLikePattern = (value: string): string =>
  value
    .replace(/!/g, '!!') // escape char itself first
    .replace(/%/g, '!%') // literal percent
    .replace(/_/g, '!_') // literal underscore
    .replace(/'/g, "''"); // single-quote within SQL string literal
