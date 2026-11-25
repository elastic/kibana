/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Oracle SQL helpers for the Oracle Database connector: bounded `runQuery` / `runStatement` over the pooled
 * `oracledb` client, the read-only write guard, and identifier/LIKE quoting.
 */
import type { Lob } from 'oracledb';
import type { ActionContext } from '../connector_spec';
import { getResponseLimit } from './clients/mssql_response_limit';
import { escapeLikePattern } from './generic_db_connector';

export const DEFAULT_MAX_ROWS = 100;
export const MAX_MAX_ROWS = 1000;

// Characters of a CLOB/NCLOB kept per cell, and bytes of a RAW kept (as hex). Longer values are cut and marked.
const MAX_LOB_CHARS = 10000;
const MAX_RAW_BYTES = 2000;

// Matches the Actions default for xpack.actions.maxResponseContentLength when the client did not record one.
const DEFAULT_MAX_CONTENT_LENGTH = 1024 * 1024;

// Constructs that can follow SELECT/WITH and still write, lock, or reach outside the database. This is a best-effort
// backstop, not exhaustive: a user-defined function called from a SELECT can do anything its owner can, so
// least-privilege database credentials are the real control. `query` also runs in a READ ONLY transaction.
// - FOR UPDATE: takes row locks.
// - WITH FUNCTION / PROCEDURE: PL/SQL declared inline in the query.
// - UTL_* / DBMS_*: packages callable from SQL for network, file, lock and job side effects (UTL_HTTP would bypass
//   xpack.actions.allowedHosts).
// - HTTPURITYPE, URITYPE, DBURITYPE, XDBURITYPE: fetch a URL from SQL.
// - @: a database link, which reads or writes on another database.
export const ORACLE_READ_GUARD_PATTERN =
  /\bFOR\s+UPDATE\b|\bWITH\s+(?:FUNCTION|PROCEDURE)\b|\b(?:UTL_|DBMS_)\w*|\b(?:HTTP|DB|XDB)?URITYPE\b|\bURIFACTORY\b|@/i;

const QUOTE_PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };

// Replaces comments and string literals with spaces, keeping the length, so the write-token scan only sees SQL tokens.
// A comment is whitespace to Oracle (`DROP/**\/TABLE` is `DROP TABLE`). Double-quoted identifiers keep their text and
// lose only the quotes, because a package can be called as `SYS."DBMS_LOCK".SLEEP(1)`. Only the check sees this text.
/** Blanks comments and string literals so the read guard scans only SQL tokens. */
export const blankNonCode = (sql: string): string => {
  const out: string[] = [];
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) out.push(' ');
  };
  let i = 0;
  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (char === '-' && next === '-') {
      const end = sql.slice(i).search(/[\r\n]/);
      const stop = end === -1 ? sql.length : i + end;
      blank(i, stop);
      i = stop;
    } else if (char === '/' && next === '*') {
      // Oracle block comments do not nest.
      const close = sql.indexOf('*/', i + 2);
      const stop = close === -1 ? sql.length : close + 2;
      blank(i, stop);
      i = stop;
    } else if (char === "'") {
      const prefix = out.slice(-3).join('');
      const isAlternativeQuote = /(?:^|[^\w$#])n?q$/i.test(prefix) && sql[i + 1] !== undefined;
      if (isAlternativeQuote) {
        // q'[ ... ]' : the delimiter after the quote ends the literal when followed by a closing quote.
        const open = sql[i + 1];
        const close = QUOTE_PAIRS[open] ?? open;
        const end = sql.indexOf(`${close}'`, i + 2);
        const stop = end === -1 ? sql.length : end + 2;
        blank(i, stop);
        i = stop;
      } else {
        let j = i + 1;
        while (j < sql.length) {
          if (sql[j] === "'" && sql[j + 1] === "'") {
            j += 2; // a doubled quote is an escaped quote
          } else if (sql[j] === "'") {
            j++;
            break;
          } else {
            j++;
          }
        }
        blank(i, j);
        i = j;
      }
    } else if (char === '"') {
      out.push(' ');
      i++;
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          out.push(' ', ' ');
          i += 2;
        } else if (sql[i] === '"') {
          out.push(' ');
          i++;
          break;
        } else {
          out.push(sql[i] === ';' ? ' ' : sql[i]);
          i++;
        }
      }
    } else {
      out.push(char);
      i++;
    }
  }
  return out.join('');
};

// Oracle rejects a trailing `;` (ORA-00911), which agents often add. `blanked` is `blankNonCode(sql)`, so a `;` inside
// a literal is never touched.
/** Removes a single trailing semicolon when only whitespace and comments follow it. */
export const stripTrailingSemicolon = (sql: string, blanked: string): string => {
  const index = blanked.lastIndexOf(';');
  if (index === -1 || blanked.slice(index + 1).trim() !== '') {
    return sql;
  }
  return sql.slice(0, index) + sql.slice(index + 1);
};

export interface SqlResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  /** Rows changed by the statement, as reported by Oracle (relevant for writes). */
  rowsAffected?: number;
  truncated: boolean;
}

const isLob = (value: unknown): value is Lob =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Lob).getData === 'function' &&
  typeof (value as Lob).chunkSize === 'number';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

// The driver builds a JS Date for DATE and TIMESTAMP from the stored wall-clock fields in the Node process's local
// time zone, so the local fields give back exactly what is stored, on any host. These types carry no zone, so none
// is added.
const formatWallClock = (date: Date): string => {
  const ms = date.getMilliseconds();
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    (ms ? `.${pad(ms, 3)}` : '')
  );
};

interface ColumnTypes {
  blob: Lob['type'];
  timestampTz: unknown;
  timestampLtz: unknown;
}

// oracledb returns CLOB/BLOB cells as Lob streams and RAW as Buffer, and none of them serialize to useful JSON.
// Text is read up to MAX_LOB_CHARS, binary data is described rather than returned. Dates in zone-aware columns
// are real instants (ISO 8601 in UTC); other dates are zoneless wall-clock values.
const normalizeValue = async (
  value: unknown,
  { blobType, isInstant }: { blobType: Lob['type']; isInstant: boolean }
): Promise<unknown> => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return isInstant ? value.toISOString() : formatWallClock(value);
  }
  if (Buffer.isBuffer(value)) {
    const hex = value.subarray(0, MAX_RAW_BYTES).toString('hex');
    return value.length > MAX_RAW_BYTES ? `${hex}… [${value.length} bytes total]` : hex;
  }
  if (isLob(value)) {
    try {
      if (value.type === blobType) {
        return `[BLOB, ${value.length} bytes]`;
      }
      const text = await value.getData(1, MAX_LOB_CHARS);
      if (text === null || text === undefined) return null;
      const str = text.toString();
      return value.length > MAX_LOB_CHARS
        ? `${str}… [truncated, ${value.length} characters total]`
        : str;
    } finally {
      value.destroy();
    }
  }
  return value;
};

const rowByteLength = (row: Record<string, unknown>): number =>
  Buffer.byteLength(JSON.stringify(row), 'utf8');

// Retains rows until `maxRows` or the Actions maximum response size is reached, then reports that it is full.
const createRowCollector = (maxRows: number, maxContentLength: number, types: ColumnTypes) => {
  const rows: Array<Record<string, unknown>> = [];
  const instantColumns = new Set<string>();
  let retainedBytes = 0;
  let truncated = false;
  return {
    rows,
    isTruncated: () => truncated,
    /** Records which columns hold a zone-aware timestamp, from the result metadata. */
    setMetadata: (metadata: Array<{ name: string; dbType?: unknown }> = []): void => {
      metadata.forEach(({ name, dbType }) => {
        if (dbType === types.timestampTz || dbType === types.timestampLtz) {
          instantColumns.add(name);
        }
      });
    },
    /** Returns false once the row did not fit, after which the caller should stop reading. */
    add: async (rawRow: Record<string, unknown>): Promise<boolean> => {
      if (rows.length >= maxRows) {
        truncated = true;
        return false;
      }
      const row: Record<string, unknown> = {};
      for (const [name, value] of Object.entries(rawRow)) {
        row[name] = await normalizeValue(value, {
          blobType: types.blob,
          isInstant: instantColumns.has(name),
        });
      }
      const rowBytes = rowByteLength(row);
      if (retainedBytes + rowBytes > maxContentLength) {
        truncated = true;
        return false;
      }
      rows.push(row);
      retainedBytes += rowBytes;
      return true;
    },
  };
};

const columnTypes = (lib: typeof import('oracledb')): ColumnTypes => ({
  blob: lib.BLOB,
  timestampTz: lib.DB_TYPE_TIMESTAMP_TZ,
  timestampLtz: lib.DB_TYPE_TIMESTAMP_LTZ,
});

type Binds = Record<string, string | number>;

const quietly = async (fn: () => Promise<unknown>): Promise<void> => {
  try {
    await fn();
  } catch {
    // Cleanup must not mask the original result or error.
  }
};

// Streams rows inside a READ ONLY transaction (writes fail with ORA-01456), keeping rows only up to `maxRows` and the
// Actions maximum response size, then flags the result as truncated and closes the cursor. The transaction is rolled
// back before the connection returns to the pool.
const runQueryOnce = async (
  ctx: ActionContext,
  sql: string,
  { binds = {}, maxRows = DEFAULT_MAX_ROWS }: { binds?: Binds; maxRows?: number } = {}
): Promise<SqlResult> => {
  const pool = await ctx.getClient('oracle');
  const lib = await import('oracledb');
  const collector = createRowCollector(
    maxRows,
    getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH,
    columnTypes(lib)
  );
  const connection = await pool.getConnection();
  try {
    await connection.execute('SET TRANSACTION READ ONLY');
    const stream = connection.queryStream<Record<string, unknown>>(sql, binds, {
      outFormat: lib.OUT_FORMAT_OBJECT,
      fetchArraySize: Math.min(maxRows + 1, 100),
    });
    stream.on('metadata', collector.setMetadata);
    try {
      for await (const row of stream) {
        if (!(await collector.add(row))) break;
      }
    } finally {
      stream.destroy();
    }
    return {
      rows: collector.rows,
      rowCount: collector.rows.length,
      truncated: collector.isTruncated(),
    };
  } finally {
    await quietly(() => connection.rollback());
    await quietly(() => connection.close());
  }
};

// A READ ONLY transaction cannot read a table whose definition changed in the last moment (ORA-01466, observed for
// 1 to 2 seconds after DDL), so the read is retried a few times instead of dropping the read-only protection.
const DDL_RETRY_ATTEMPTS = 3;
const DDL_RETRY_DELAY_MS = 1000;

export const runQuery = async (
  ctx: ActionContext,
  sql: string,
  options: { binds?: Binds; maxRows?: number } = {}
): Promise<SqlResult> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await runQueryOnce(ctx, sql, options);
    } catch (err) {
      const isRetryable = err instanceof Error && /^ORA-01466\b/.test(err.message);
      if (!isRetryable || attempt >= DDL_RETRY_ATTEMPTS) throw err;
      await new Promise((resolve) => setTimeout(resolve, DDL_RETRY_DELAY_MS));
    }
  }
};

// Used only by the workflow-only `executeSql`, so it makes no read-only promise. The connection is dropped from the
// pool afterwards, so session state the statement changed (`ALTER SESSION`, package variables) never reaches another call.
/** Runs any statement on a pooled connection and commits it. */
export const runStatement = async (ctx: ActionContext, sql: string): Promise<SqlResult> => {
  const pool = await ctx.getClient('oracle');
  const lib = await import('oracledb');
  const collector = createRowCollector(
    MAX_MAX_ROWS,
    getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH,
    columnTypes(lib)
  );
  const connection = await pool.getConnection();
  try {
    const result = await connection.execute<Record<string, unknown>>(
      sql,
      {},
      { outFormat: lib.OUT_FORMAT_OBJECT, autoCommit: true, maxRows: MAX_MAX_ROWS + 1 }
    );
    collector.setMetadata(result.metaData);
    for (const row of result.rows ?? []) {
      if (!(await collector.add(row))) break;
    }
    return {
      rows: collector.rows,
      rowCount: collector.rows.length,
      ...(result.rowsAffected !== undefined ? { rowsAffected: result.rowsAffected } : {}),
      truncated: collector.isTruncated(),
    };
  } finally {
    await quietly(() => connection.close({ drop: true }));
  }
};

// Quotes an Oracle identifier as "name" (case-sensitive), doubling any embedded quote.
export const quoteIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

// Oracle LIKE has no wildcards beyond % and _, which the shared escape (! % _) covers. The pattern is lower-cased
// here so callers can compare it to LOWER(column).
export const escapeSearchTerm = (term: string): string =>
  escapeLikePattern(term.toLowerCase(), false);

export const resolveMaxRows = (maxRows?: number): number => maxRows ?? DEFAULT_MAX_ROWS;
