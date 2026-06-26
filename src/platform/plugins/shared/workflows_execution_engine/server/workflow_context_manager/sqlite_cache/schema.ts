/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * DDL for the step_io cache table.
 *
 * Design notes:
 * - STRICT: rejects type coercions so bad data fails loudly rather than silently.
 * - PK (step_execution_id, kind): retains the kind column for future extensibility
 *   (e.g. input caching) even though only 'output' is written today.
 * - workflow_run_id index: used by the cleanup DELETE and the workflowRunId guard
 *   on SELECT.
 * - payload TEXT (default): JSON-serialised output stored as plain text.
 * - payload BLOB (jsonbStorage=true): binary JSON via SQLite jsonb(), enabling
 *   future json_extract() queries at the worker. STRICT rejects JS string into BLOB,
 *   so two DDL constants are provided — the worker selects based on config.
 * - PRAGMA journal_mode=WAL: allows concurrent readers alongside the single writer.
 * - PRAGMA synchronous=OFF: safe because ES is the durable tier; the SQLite cache
 *   is disposable (tmpdir, process-local, truncated on boot).
 */

export const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS step_io (
  step_execution_id TEXT NOT NULL,
  kind              TEXT NOT NULL,
  workflow_run_id   TEXT NOT NULL,
  payload           TEXT,
  PRIMARY KEY (step_execution_id, kind)
) STRICT;
`;

/** Used when jsonbStorage=true. payload is BLOB to hold SQLite jsonb() output. */
export const CREATE_TABLE_JSONB_SQL = `
CREATE TABLE IF NOT EXISTS step_io (
  step_execution_id TEXT NOT NULL,
  kind              TEXT NOT NULL,
  workflow_run_id   TEXT NOT NULL,
  payload           BLOB,
  PRIMARY KEY (step_execution_id, kind)
) STRICT;
`;

export const CREATE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_step_io_run
  ON step_io (workflow_run_id);
`;

export const PRAGMA_WAL = `PRAGMA journal_mode=WAL`;
export const PRAGMA_SYNC_OFF = `PRAGMA synchronous=OFF`;

export const TRUNCATE_SQL = `DELETE FROM step_io`;
