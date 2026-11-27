/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * T-SQL helpers shared by the SQL Server family of connectors (Azure SQL, Microsoft SQL Server): a streaming
 * `runSql` over the pooled `mssql` client, the read-only write guard, and identifier/LIKE quoting.
 */
import type { ActionContext } from '../connector_spec';
import { getResponseLimit } from './clients/mssql_response_limit';
import { escapeLikePattern } from './generic_db_connector';

export const DEFAULT_MAX_ROWS = 100;
export const MAX_MAX_ROWS = 1000;
export const DEFAULT_SCHEMA = 'dbo';

// T-SQL write paths the shared MySQL-oriented guard misses: SELECT ... INTO, procedure calls (T-SQL allows a
// second statement without a semicolon), INSERT/MERGE without INTO, and linked-server or ad hoc remote access.
// This is a best-effort backstop, not exhaustive; least-privilege database credentials are the real control.
export const TSQL_WRITE_PATTERN =
  /\b(INTO|EXEC|EXECUTE|INSERT|MERGE|OPENROWSET|OPENQUERY|OPENDATASOURCE|WAITFOR)\b/i;

// T-SQL statements that can follow a SELECT in the same batch with no semicolon and change server, session or data
// state: server commands, permission changes, transactions, session settings, database switches, and the legacy
// text-column writes. Everything except ENABLE/DISABLE and RECEIVE is a T-SQL reserved word, so it cannot be an
// unquoted column or alias (quoted ones are blanked before the scan) and is matched bare. The exceptions are
// matched in their statement forms. `USE HINT` / `USE PLAN` are valid query hints and stay allowed. Best-effort:
// a RECEIVE that names columns instead of `*` or TOP is not caught.
export const MSSQL_SERVER_COMMAND_PATTERN =
  /\b(?:SHUTDOWN|DBCC|RECONFIGURE|KILL|BACKUP|RESTORE|DENY|GRANT|REVOKE|BEGIN|SET|USE(?!\s+(?:HINT|PLAN)\b)|WRITETEXT|UPDATETEXT|(?:DISABLE|ENABLE)\s+TRIGGER)\b|\bRECEIVE\s+(?:TOP\b|\*)/i;

// Write guard for the SQL Server connector: the shared T-SQL write tokens plus the server-level commands above.
export const MSSQL_READ_GUARD_PATTERN = new RegExp(
  `${TSQL_WRITE_PATTERN.source}|${MSSQL_SERVER_COMMAND_PATTERN.source}`,
  'i'
);

// Replaces comments, string literals, and quoted identifiers with a space so the write-token scan only sees SQL
// tokens. A keyword inside a literal or [identifier] is not a statement, and a comment is whitespace to T-SQL
// (`DROP/**/TABLE` is `DROP TABLE`). Only the check sees this text; the original SQL is what runs. Block comments
// nest in T-SQL, so an unmatched `*/` can only leave extra text visible to the scan, never hide any.
export const blankNonCode = (sql: string): string => {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '-' && next === '-') {
      // T-SQL ends a line comment at CR as well as LF, so `-- x\rDROP TABLE t` still runs the DROP.
      const end = sql.slice(i).search(/[\r\n]/);
      i = end === -1 ? sql.length : i + end;
      out += ' ';
    } else if (char === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') {
          depth++;
          i += 2;
        } else if (sql[i] === '*' && sql[i + 1] === '/') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      out += ' ';
    } else if (char === "'" || char === '"' || char === '[') {
      const close = char === '[' ? ']' : char;
      i++;
      while (i < sql.length) {
        if (sql[i] === close && sql[i + 1] === close) {
          i += 2; // a doubled delimiter is an escaped delimiter ('' "" ]])
        } else if (sql[i] === close) {
          i++;
          break;
        } else {
          i++;
        }
      }
      out += ' ';
    } else {
      out += char;
      i++;
    }
  }
  return out;
};

export interface SqlResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  /** Rows changed by each statement, as reported by SQL Server (relevant for writes). */
  rowsAffected: number[];
  truncated: boolean;
}

// Matches the Actions default for xpack.actions.maxResponseContentLength when the client did not record one.
const DEFAULT_MAX_CONTENT_LENGTH = 1024 * 1024;

const rowByteLength = (row: Record<string, unknown>): number =>
  Buffer.byteLength(JSON.stringify(row), 'utf8');

// mssql reports our own cancellation as a "Canceled." error; anything else is a real failure.
const isCancellation = (err: Error): boolean =>
  (err as { code?: string }).code === 'ECANCEL' || err.message === 'Canceled.';

/**
 * Streams rows so memory stays bounded: rows are retained only until `maxRows` or the Actions maximum
 * response size is reached, then the result is flagged as truncated. With `cancelOnLimit` the request is
 * cancelled at that point (reads); without it the statement runs to completion and the rest of the output
 * is discarded (writes must not be rolled back just to cap what is returned).
 * A single row is fully buffered by the driver before it is seen here, so one very large value cannot be
 * prevented from being read, only from being retained.
 */
export const runSql = async (
  ctx: ActionContext,
  sql: string,
  {
    params = {},
    maxRows = DEFAULT_MAX_ROWS,
    cancelOnLimit = true,
  }: { params?: Record<string, string>; maxRows?: number; cancelOnLimit?: boolean } = {}
): Promise<SqlResult> => {
  const pool = await ctx.getClient('mssql');
  const maxContentLength = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const request = pool.request();
  request.stream = true;
  Object.entries(params).forEach(([name, value]) => request.input(name, value));

  return new Promise<SqlResult>((resolve, reject) => {
    const rows: Array<Record<string, unknown>> = [];
    let retainedBytes = 0;
    let truncated = false;
    let cancelled = false;
    let firstError: Error | undefined;

    request.on('row', (row: Record<string, unknown>) => {
      if (truncated) return;
      const rowBytes = rowByteLength(row);
      if (rows.length >= maxRows || retainedBytes + rowBytes > maxContentLength) {
        truncated = true;
        if (cancelOnLimit) {
          cancelled = true;
          request.cancel();
        }
        return;
      }
      rows.push(row);
      retainedBytes += rowBytes;
    });
    // In stream mode `done` always follows `error`, so settle there.
    request.on('error', (err: Error) => {
      if (cancelled && isCancellation(err)) return;
      firstError = firstError ?? err;
    });
    request.on('done', (summary: { rowsAffected?: number[] }) => {
      if (firstError) {
        reject(firstError);
        return;
      }
      resolve({
        rows,
        rowCount: rows.length,
        rowsAffected: summary?.rowsAffected ?? [],
        truncated,
      });
    });
    // Driver failures raised before any event fires (e.g. an unsupported parameter) reject this promise
    // instead; without consuming it the rejection is unhandled and this call would never settle.
    void request.query(sql).catch(reject);
  });
};

// Quotes a T-SQL identifier as [name], doubling any closing bracket.
export const quoteIdentifier = (identifier: string): string =>
  `[${identifier.replace(/\]/g, ']]')}]`;

// T-SQL LIKE also treats [ as a wildcard, which the shared escape (! % _) does not cover. Does not fold case, so a
// caller can fold it in SQL (`LOWER(@pattern)`) and compare both sides under the server collation.
export const escapeLikeTerm = (term: string): string =>
  escapeLikePattern(term, false).replace(/\[/g, '![');

// Variant that folds case in JavaScript, for callers that compare against `LOWER(column)` without folding the pattern.
export const escapeSearchTerm = (term: string): string => escapeLikeTerm(term.toLowerCase());

export const resolveMaxRows = (maxRows?: number): number => maxRows ?? DEFAULT_MAX_ROWS;
