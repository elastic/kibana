/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecordExporter } from '@opentelemetry/sdk-logs';
type ReadableLogRecords = Parameters<LogRecordExporter['export']>[0];
type ExportResultCallback = Parameters<LogRecordExporter['export']>[1];
/**
 * Classifies an error surfaced by an OTLP log exporter as transient (worth retrying) or not.
 * Exporters expose no structured "retryable" flag: network errors carry a string `code`,
 * HTTP/gRPC failures a numeric (or numeric-string) `code`, and two transient SDK cases
 * (request timeout, inner retries exhausted) only a fixed message.
 */
export declare const isRetryableExportError: (error: Error | undefined) => boolean;
/**
 * A {@link LogRecordExporter} decorator that retries transient export failures with jittered
 * exponential backoff until `maxElapsedTimeMs` is spent, then drops the batch. It extends the
 * SDK's built-in ~13s retry window, which still runs within each attempt made here.
 *
 * Callers must configure the batch processor's `exportTimeoutMillis` above `maxElapsedTimeMs`.
 * Timers are unref'd; `shutdown()` aborts pending retries and `forceFlush()` runs them now.
 *
 * @internal
 */
export declare class RetryingLogRecordExporter implements LogRecordExporter {
  private readonly delegate;
  private readonly maxElapsedTimeMs;
  private isShutdown;
  private readonly pendingRetries;
  constructor(delegate: LogRecordExporter, maxElapsedTimeMs: number);
  export(logs: ReadableLogRecords, resultCallback: ExportResultCallback): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
export {};
