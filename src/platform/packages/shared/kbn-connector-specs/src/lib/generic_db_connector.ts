/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const READ_ONLY_PREFIX = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|WITH)\b/i;

// WITH can prefix INSERT/UPDATE/DELETE in a CTE — catch the most common write patterns.
const CTE_WRITE_PATTERN = /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i;

export const assertReadOnly = (sql: string): void => {
  if (!READ_ONLY_PREFIX.test(sql)) {
    throw new Error(
      'Only read-only SQL statements are permitted (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH)'
    );
  }
  if (sql.includes(';')) {
    throw new Error('Multi-statement SQL is not permitted');
  }
  if (/^\s*WITH\b/i.test(sql) && CTE_WRITE_PATTERN.test(sql)) {
    throw new Error('Write operations are not permitted');
  }
};

// LIKE escape character is '!'. Safe regardless of NO_BACKSLASH_ESCAPES.
export const escapeLikePattern = (value: string): string =>
  value
    .replace(/!/g, '!!') // escape char itself first
    .replace(/%/g, '!%') // literal percent
    .replace(/_/g, '!_') // literal underscore
    .replace(/'/g, "''"); // single-quote within SQL string literal
