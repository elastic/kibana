/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertReadOnly, SELECT_OR_WITH_PREFIX } from '../../lib/generic_db_connector';

const isIdentifierChar = (char: string | undefined): boolean =>
  char !== undefined && /[A-Za-z0-9_$\u0080-￿]/.test(char);

const DOLLAR_QUOTE_TAG = /^\$(?:[A-Za-z_\u0080-￿][A-Za-z0-9_\u0080-￿]*)?\$/;

// A `$n` bind placeholder outside a literal. The `query` wrapper binds its own row limit as `$1`.
const BIND_PLACEHOLDER = /(?<![A-Za-z0-9_$\u0080-￿])\$\d/;

/** Blanks comments, literals and quoted identifiers (keeping length) so the read-only scan sees only SQL tokens. */
export const blankNonCode = (sql: string): string => {
  const out: string[] = [];
  const blank = (from: number, to: number) => {
    const end = Math.min(to, sql.length);
    for (let k = from; k < end; k++) {
      out.push(sql[k] === '\n' ? '\n' : ' ');
    }
    return end;
  };

  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '-' && next === '-') {
      const newline = sql.indexOf('\n', i);
      i = blank(i, newline === -1 ? sql.length : newline);
    } else if (char === '/' && next === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < sql.length && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') {
          depth++;
          j += 2;
        } else if (sql[j] === '*' && sql[j + 1] === '/') {
          depth--;
          j += 2;
        } else {
          j++;
        }
      }
      i = blank(i, j);
    } else if (char === "'" || char === '"') {
      // E'...' strings treat backslash as an escape; plain strings and quoted identifiers do not.
      const backslashEscapes =
        char === "'" && /[eE]/.test(sql[i - 1] ?? '') && !isIdentifierChar(sql[i - 2]);
      let j = i + 1;
      while (j < sql.length) {
        if (backslashEscapes && sql[j] === '\\') {
          j += 2;
        } else if (sql[j] === char && sql[j + 1] === char) {
          j += 2; // a doubled delimiter is an escaped delimiter ('' "")
        } else if (sql[j] === char) {
          j++;
          break;
        } else {
          j++;
        }
      }
      i = blank(i, j);
    } else if (char === '$' && !isIdentifierChar(sql[i - 1])) {
      const tag = DOLLAR_QUOTE_TAG.exec(sql.slice(i))?.[0];
      if (tag) {
        const close = sql.indexOf(tag, i + tag.length);
        i = blank(i, close === -1 ? sql.length : close + tag.length);
      } else {
        out.push(char);
        i++;
      }
    } else {
      out.push(char);
      i++;
    }
  }
  return out.join('');
};

// Wraps `query` so the row limit is a bound parameter, which makes the server reject multi-statement input.
const wrapQuery = (sql: string, code: string): string => {
  // assertReadOnly already guaranteed that only whitespace or comments follow the first semicolon.
  const semicolon = code.indexOf(';');
  const statement = semicolon === -1 ? sql : sql.slice(0, semicolon);
  return `SELECT * FROM (\n${statement}\n) AS kibana_query LIMIT $1`;
};

/**
 * Validates a caller's `query` SQL and returns it wrapped as `SELECT * FROM (<sql>) AS kibana_query LIMIT $1`.
 * Throws unless it is a single SELECT or WITH statement without bind placeholders.
 */
export const toReadOnlyQuery = (sql: string): string => {
  const code = blankNonCode(sql);
  assertReadOnly(code, SELECT_OR_WITH_PREFIX);
  if (BIND_PLACEHOLDER.test(code)) {
    throw new Error(
      'Bind placeholders ($1, $2, ...) are not supported. Write literal values into the query instead.'
    );
  }
  return wrapQuery(sql, code);
};
