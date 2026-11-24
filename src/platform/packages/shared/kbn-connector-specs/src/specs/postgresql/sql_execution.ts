/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryResult } from 'pg';
import type { ActionContext } from '../../connector_spec';
import { getResponseLimit } from '../../lib/clients/postgresql_response_limit';

export const DEFAULT_MAX_ROWS = 100;
export const MAX_MAX_ROWS = 1000;

// Rows fetched in the first cursor batch; later batches are sized from the row width and the remaining budget.
const FETCH_BATCH_SIZE = 20;

// Fallback for xpack.actions.maxResponseContentLength when the client did not record one.
const DEFAULT_MAX_CONTENT_LENGTH = 1024 * 1024;

export type Row = Record<string, unknown>;

export interface SqlResult<T extends Row = Row> {
  rows: T[];
  rowCount: number;
  truncated: boolean;
}

/** Drops rows beyond maxRows or the byte limit, flags the result as truncated and reports the bytes kept. */
export const capRows = <T extends Row>(
  rows: T[],
  maxRows: number,
  maxBytes: number
): { rows: T[]; truncated: boolean; bytes: number } => {
  const kept: T[] = [];
  let retainedBytes = 0;
  let truncated = rows.length > maxRows;
  for (const row of rows.slice(0, maxRows)) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), 'utf8');
    if (retainedBytes + rowBytes > maxBytes) {
      truncated = true;
      break;
    }
    kept.push(row);
    retainedBytes += rowBytes;
  }
  return { rows: kept, truncated, bytes: retainedBytes };
};

/** Runs one statement of a read-only session; every statement in a session shares one response-size budget. */
export type ReadOnlyQuery = <T extends Row = Row>(
  text: string,
  values?: unknown[],
  maxRows?: number
) => Promise<SqlResult<T>>;

/** Runs `fn` in a read-only transaction on one pooled connection, always rolled back and reset afterwards. */
export const withReadOnlySession = async <R>(
  ctx: ActionContext,
  fn: (query: ReadOnlyQuery) => Promise<R>
): Promise<R> => {
  const pool = await ctx.getClient('postgresql');
  let remainingBytes = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const client = await pool.connect();
  let discard = false;
  // pg-pool drops its own error listener while a client is checked out; without one a connection error is thrown.
  const onClientError = (err: Error) => {
    discard = true;
    ctx.log.warn(`[postgresql] Connection error during query: ${err.message}`);
  };
  client.on('error', onClientError);
  let cursorCount = 0;

  const query: ReadOnlyQuery = async <T extends Row = Row>(
    text: string,
    values: unknown[] = [],
    maxRows: number = DEFAULT_MAX_ROWS
  ) => {
    // Read through a server-side cursor so a few very wide rows cannot be buffered in full before the cap applies.
    const cursor = `kibana_cursor_${cursorCount++}`;
    await client.query({ text: `DECLARE ${cursor} NO SCROLL CURSOR FOR ${text}`, values });
    const rows: T[] = [];
    let truncated = false;
    let batchSize = Math.min(FETCH_BATCH_SIZE, maxRows + 1);
    for (;;) {
      const { rows: batch } = await client.query<T>(`FETCH ${batchSize} FROM ${cursor}`);
      const capped = capRows(batch, maxRows - rows.length, remainingBytes);
      rows.push(...capped.rows);
      remainingBytes -= capped.bytes;
      if (capped.truncated) {
        truncated = true;
        break;
      }
      if (batch.length < batchSize) break;
      // Size the next batch from the average row width so far, so buffering stays near the remaining byte
      // budget without a round trip per few rows. One row past maxRows is enough to detect truncation.
      const averageBytes = Math.max(1, capped.bytes / batch.length);
      batchSize = Math.min(
        maxRows - rows.length + 1,
        Math.max(1, Math.floor(remainingBytes / averageBytes))
      );
    }
    return { rows, rowCount: rows.length, truncated };
  };

  try {
    await client.query('BEGIN READ ONLY');
    return await fn(query);
  } finally {
    // ROLLBACK does not release session-level state such as advisory locks, so reset the session as well.
    // A connection that cannot be reset is in an unknown state; destroy it rather than return it to the pool.
    await client
      .query('ROLLBACK')
      .then(() => client.query('DISCARD ALL'))
      .catch(() => {
        discard = true;
      });
    client.removeListener('error', onClientError);
    client.release(discard);
  }
};

/** Runs one statement in a read-only session. */
export const runReadOnly = async <T extends Row = Row>(
  ctx: ActionContext,
  text: string,
  values: unknown[] = [],
  maxRows: number = DEFAULT_MAX_ROWS
): Promise<SqlResult<T>> => withReadOnlySession(ctx, (query) => query<T>(text, values, maxRows));

export interface StatementResult {
  command: string;
  rowCount: number | null;
  rows: Row[];
  truncated: boolean;
}

/** Runs unrestricted SQL, possibly several statements, and returns one capped result per statement. */
export const runUnrestricted = async (
  ctx: ActionContext,
  sql: string
): Promise<StatementResult[]> => {
  const pool = await ctx.getClient('postgresql');
  let remainingBytes = getResponseLimit(pool) ?? DEFAULT_MAX_CONTENT_LENGTH;
  const client = await pool.connect();
  // pg-pool drops its own error listener while a client is checked out; without one a connection error is thrown.
  client.on('error', (err) => {
    ctx.log.warn(`[postgresql] Connection error during executeSql: ${err.message}`);
  });
  let outcome: QueryResult | QueryResult[];
  try {
    // A multi-statement string yields one result per statement at runtime, which the driver types as one.
    outcome = await client.query(sql);
  } finally {
    // The statements may change session state (an unfinished BEGIN, SET, advisory locks), so destroy the
    // connection instead of returning it to the shared pool.
    client.release(true);
  }
  const results = Array.isArray(outcome) ? outcome : [outcome];
  // One byte budget for the whole action, not one per statement.
  return results.map(({ command, rowCount, rows }) => {
    const capped = capRows(rows, MAX_MAX_ROWS, remainingBytes);
    remainingBytes -= capped.bytes;
    return { command, rowCount, rows: capped.rows, truncated: capped.truncated };
  });
};
