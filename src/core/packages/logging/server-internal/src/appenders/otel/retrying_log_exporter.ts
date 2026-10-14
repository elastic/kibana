/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diag } from '@opentelemetry/api';
import type { LogRecordExporter } from '@opentelemetry/sdk-logs';

type ReadableLogRecords = Parameters<LogRecordExporter['export']>[0];
type ExportResultCallback = Parameters<LogRecordExporter['export']>[1];

/** `ExportResultCode.SUCCESS` from `@opentelemetry/core` (not a direct dependency). */
const EXPORT_RESULT_SUCCESS = 0;

// Mirrors the SDK's internal RetryingTransport, with a higher cap to suit a multi-minute budget.
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;
const BACKOFF_MULTIPLIER = 1.5;
const JITTER = 0.2;

/** Transient network error codes, same set the SDK's HTTP transport treats as retryable. */
const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ENETUNREACH',
  'EHOSTUNREACH',
]);

/** HTTP statuses the SDK treats as retryable (see `isExportHTTPErrorRetryable`). */
const RETRYABLE_HTTP_STATUS_CODES = new Set([429, 502, 503, 504]);

/** DEADLINE_EXCEEDED (4) and UNAVAILABLE (14); gRPC statuses (0-16) never collide with HTTP ones. */
const RETRYABLE_GRPC_STATUS_CODES = new Set([4, 14]);

/**
 * Classifies an error surfaced by an OTLP log exporter as transient (worth retrying) or not.
 * Exporters expose no structured "retryable" flag: network errors carry a string `code`,
 * HTTP/gRPC failures a numeric (or numeric-string) `code`, and two transient SDK cases
 * (request timeout, inner retries exhausted) only a fixed message.
 */
export const isRetryableExportError = (error: Error | undefined): boolean => {
  if (!error) {
    return false;
  }
  const { code } = error as { code?: unknown };
  if (typeof code === 'string' && RETRYABLE_NETWORK_ERROR_CODES.has(code)) {
    return true;
  }
  if (typeof code === 'string' || typeof code === 'number') {
    const numericCode = Number(code);
    return (
      RETRYABLE_HTTP_STATUS_CODES.has(numericCode) || RETRYABLE_GRPC_STATUS_CODES.has(numericCode)
    );
  }
  return (
    error.message === 'Export failed with retryable status' || error.message === 'Request timed out'
  );
};

interface PendingRetry {
  /** Cancel the backoff wait and run the retry attempt immediately. */
  readonly runNow: () => void;
  /** Cancel the retry and report the last failure to the processor. */
  readonly abort: () => void;
}

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
export class RetryingLogRecordExporter implements LogRecordExporter {
  private isShutdown = false;
  private readonly pendingRetries = new Set<PendingRetry>();

  constructor(
    private readonly delegate: LogRecordExporter,
    private readonly maxElapsedTimeMs: number
  ) {}

  public export(logs: ReadableLogRecords, resultCallback: ExportResultCallback): void {
    const deadline = Date.now() + this.maxElapsedTimeMs;
    let nextBackoffMs = INITIAL_BACKOFF_MS;

    const attempt = (): void => {
      this.delegate.export(logs, (result) => {
        if (
          result.code === EXPORT_RESULT_SUCCESS ||
          this.isShutdown ||
          !isRetryableExportError(result.error)
        ) {
          resultCallback(result);
          return;
        }

        const jitterFactor = 1 + (Math.random() * 2 - 1) * JITTER;
        const backoffMs = Math.min(nextBackoffMs * jitterFactor, MAX_BACKOFF_MS);
        nextBackoffMs = nextBackoffMs * BACKOFF_MULTIPLIER;

        if (Date.now() + backoffMs >= deadline) {
          diag.warn(
            `OTLP log export still failing after retry budget of ${this.maxElapsedTimeMs}ms, dropping batch of ${logs.length} log records: ${result.error}`
          );
          resultCallback(result);
          return;
        }

        // `pending` must be created before the timer so its callback never sees it uninitialized.
        const pending: PendingRetry = {
          runNow: () => {
            clearTimeout(timer);
            this.pendingRetries.delete(pending);
            attempt();
          },
          abort: () => {
            clearTimeout(timer);
            this.pendingRetries.delete(pending);
            resultCallback(result);
          },
        };
        this.pendingRetries.add(pending);
        const timer = setTimeout(() => {
          this.pendingRetries.delete(pending);
          attempt();
        }, backoffMs);
        timer.unref();
      });
    };

    attempt();
  }

  public forceFlush(): Promise<void> {
    for (const pending of [...this.pendingRetries]) {
      pending.runNow();
    }
    return this.delegate.forceFlush();
  }

  public shutdown(): Promise<void> {
    this.isShutdown = true;
    for (const pending of [...this.pendingRetries]) {
      pending.abort();
    }
    return this.delegate.shutdown();
  }
}
