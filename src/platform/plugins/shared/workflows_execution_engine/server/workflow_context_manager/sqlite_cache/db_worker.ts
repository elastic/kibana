/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// node:sqlite is experimental on Node 24.14.x — the ExperimentalWarning is intentionally
// not suppressed here; it will appear in stderr when the flag is enabled.
// eslint-disable-next-line @kbn/imports/no_unresolved_imports
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';
import { parentPort, workerData } from 'worker_threads';
import { zstdCompressSync, zstdDecompressSync } from 'zlib';
import type { MessageFromWorker, MessageToWorker } from './messages';
import {
  CREATE_INDEX_SQL,
  CREATE_TABLE_JSONB_SQL,
  CREATE_TABLE_SQL,
  PRAGMA_SYNC_OFF,
  PRAGMA_WAL,
  TRUNCATE_SQL,
} from './schema';

if (!parentPort) {
  throw new Error('db_worker must be run as a worker_thread');
}

const { compressIpc = false, jsonbStorage = false } = (workerData ?? {}) as {
  compressIpc?: boolean;
  jsonbStorage?: boolean;
};

const dbPath = path.join(os.tmpdir(), `kibana-workflows-io-cache-${process.pid}.sqlite`);
const db = new DatabaseSync(dbPath);

db.exec(PRAGMA_WAL);
db.exec(PRAGMA_SYNC_OFF);
db.exec(jsonbStorage ? CREATE_TABLE_JSONB_SQL : CREATE_TABLE_SQL);
db.exec(CREATE_INDEX_SQL);
// Truncate on boot: nothing in a fresh process can legitimately read prior rows.
db.exec(TRUNCATE_SQL);

const decoder = new TextDecoder();

// When jsonbStorage=true, payload is stored as JSONB (BLOB). jsonb(?) on write
// transcodes the JSON text to binary; json(payload) on read transcodes back to text,
// keeping the row type consistent (always a JS string) regardless of storage mode.
const stmtPut = db.prepare(
  jsonbStorage
    ? `INSERT OR REPLACE INTO step_io (step_execution_id, kind, workflow_run_id, payload)
       VALUES (?, 'output', ?, jsonb(?))`
    : `INSERT OR REPLACE INTO step_io (step_execution_id, kind, workflow_run_id, payload)
       VALUES (?, 'output', ?, ?)`
);

const stmtCleanup = db.prepare(`DELETE FROM step_io WHERE workflow_run_id = ?`);

// Cache prepared GET statements by arity to avoid re-preparing on every call.
// jsonbStorage changes the SELECT expression; arity is the only other variable.
const getStmtCache = new Map<number, ReturnType<typeof db.prepare>>();
function getGetStmt(count: number): ReturnType<typeof db.prepare> {
  let stmt = getStmtCache.get(count);
  if (!stmt) {
    const payloadExpr = jsonbStorage ? 'json(payload)' : 'payload';
    stmt = db.prepare(
      `SELECT step_execution_id, ${payloadExpr} AS payload FROM step_io
       WHERE step_execution_id IN (${Array(count).fill('?').join(',')}) AND workflow_run_id = ?`
    );
    getStmtCache.set(count, stmt);
  }
  return stmt;
}

parentPort.on('message', (msg: MessageToWorker) => {
  if (!parentPort) return;

  switch (msg.type) {
    case 'put': {
      // Decode the incoming Uint8Array to a JSON text string. When compressIpc=true
      // the bytes are zstd-compressed; when false they are raw UTF-8 JSON.
      const payloadStr = msg.payload
        ? compressIpc
          ? zstdDecompressSync(msg.payload).toString()
          : decoder.decode(msg.payload)
        : null;
      try {
        stmtPut.run(msg.stepExecutionId, msg.workflowRunId, payloadStr);
      } catch {
        // fire-and-forget — errors are swallowed; the main thread degrades via the 'exit' handler
      }
      break;
    }

    case 'get': {
      const { correlationId, stepExecutionIds, workflowRunId } = msg;
      const ids: string[] = [];
      const payloads: Array<string | Uint8Array | null> = [];

      if (stepExecutionIds.length > 0) {
        try {
          const stmt = getGetStmt(stepExecutionIds.length);
          const rows = stmt.all(...stepExecutionIds, workflowRunId) as Array<{
            step_execution_id: string;
            payload: string | null;
          }>;
          for (const row of rows) {
            ids.push(row.step_execution_id);
            const text = row.payload ?? null;
            // When compressIpc, compress each non-null payload and transfer zero-copy.
            // The worker is a dedicated thread — zstdCompressSync is safe here.
            payloads.push(compressIpc && text != null ? zstdCompressSync(Buffer.from(text)) : text);
          }
        } catch {
          // Return empty on error — main thread falls back to ES
        }
      }

      const response: MessageFromWorker = {
        type: 'get_result',
        compressed: compressIpc,
        correlationId,
        ids,
        payloads,
      };
      if (compressIpc) {
        const transferList = (payloads.filter((p) => p instanceof Uint8Array) as Uint8Array[]).map(
          (p) => p.buffer as ArrayBuffer
        );
        parentPort.postMessage(response, transferList);
      } else {
        parentPort.postMessage(response);
      }
      break;
    }

    case 'cleanup': {
      const { correlationId, workflowRunId } = msg;
      let error: string | undefined;
      try {
        stmtCleanup.run(workflowRunId);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      const response: MessageFromWorker = { type: 'cleanup_result', correlationId, error };
      parentPort.postMessage(response);
      break;
    }

    case 'shutdown': {
      db.close();
      process.exit(0);
    }
  }
});
