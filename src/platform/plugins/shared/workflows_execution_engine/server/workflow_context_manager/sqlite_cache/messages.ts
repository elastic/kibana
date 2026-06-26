/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discriminated-union message protocol between SqliteCacheClient (main thread)
 * and db_worker (worker thread).
 *
 * put direction (main→worker): payload is always a Uint8Array transferred zero-copy.
 * When compressIpc=true the bytes are zstd-compressed; when false they are raw UTF-8
 * JSON (current behaviour).
 *
 * get_result direction (worker→main): when compressIpc=true, payloads is an array of
 * zstd-compressed Uint8Arrays transferred zero-copy (compressed=true); when false,
 * payloads is an array of plain JSON strings structured-cloned (compressed=false,
 * current behaviour).
 */

// ---- Main → Worker ----------------------------------------------------------

export interface PutMessage {
  type: 'put';
  stepExecutionId: string;
  workflowRunId: string;
  /** Transferred zero-copy. Raw UTF-8 JSON when compressIpc=false; zstd-compressed bytes when true. */
  payload: Uint8Array;
}

export interface GetMessage {
  type: 'get';
  correlationId: string;
  stepExecutionIds: string[];
  workflowRunId: string;
}

export interface CleanupMessage {
  type: 'cleanup';
  correlationId: string;
  workflowRunId: string;
}

export interface ShutdownMessage {
  type: 'shutdown';
}

export type MessageToWorker = PutMessage | GetMessage | CleanupMessage | ShutdownMessage;

// ---- Worker → Main ----------------------------------------------------------

export interface GetResultMessage {
  type: 'get_result';
  correlationId: string;
  /**
   * When compressed=false (default): parallel arrays where each payload is a
   * plain JSON string (structured-cloned), or null for a stored NULL.
   * When compressed=true: each non-null payload is a zstd-compressed Uint8Array
   * transferred zero-copy; the main thread decompresses asynchronously before
   * JSON.parse.
   */
  compressed: boolean;
  ids: string[];
  payloads: Array<string | Uint8Array | null>;
}

export interface CleanupResultMessage {
  type: 'cleanup_result';
  correlationId: string;
  error?: string;
}

export type MessageFromWorker = GetResultMessage | CleanupResultMessage;
