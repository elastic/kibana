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

// Backoff parameters, mirroring the SDK's internal RetryingTransport but with a higher
// backoff cap: the SDK caps at 5s because its whole retry window is ~13s, while this
// layer is designed for a multi-minute budget.
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;
const BACKOFF_MULTIPLIER = 1.5;
const JITTER = 0.2;

/**
 * Transient Node network error codes, same set the SDK's HTTP transport treats as retryable
 * (see `isHttpTransportNetworkErrorRetryable` in `@opentelemetry/otlp-exporter-base`).
 */
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

/**
 * Transient gRPC status codes: DEADLINE_EXCEEDED (4), RESOURCE_EXHAUSTED (8), UNAVAILABLE (14).
 * The JS SDK never retries gRPC exports, so these mirror the OTLP spec's retryable statuses.
 * No collision with the HTTP set above: gRPC statuses are 0-16, HTTP statuses are >= 100.
 */
const RETRYABLE_GRPC_STATUS_CODES = new Set([4, 8, 14]);

/**
 * Classifies an error surfaced by an OTLP log exporter as transient (worth retrying) or not.
 *
 * The exporters don't expose a structured "retryable" flag on failure, so this inspects the
 * shapes they actually produce:
 * - Node network errors carry a string `code` (e.g. `ECONNREFUSED`).
 * - HTTP error responses surface as `OTLPExporterError` with the status as a numeric `code`.
 * - gRPC errors carry the gRPC status on `code`; `@grpc/grpc-js` types it as a number but at
 *   runtime it surfaces as a numeric string (e.g. `'14'`), so both forms are handled.
 * - Two transient cases surface with no `code` at all, identified only by their fixed messages:
 *   request timeouts (`'Request timed out'`, from the SDK's HTTP transport) and retryable
 *   responses whose inner SDK retries were exhausted (`'Export failed with retryable status'`,
 *   from the SDK's export delegate — e.g. a collector consistently answering 429/503).
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
 * A {@link LogRecordExporter} decorator that keeps retrying transient export failures with
 * exponential backoff (plus jitter) until a wall-clock budget (`maxElapsedTimeMs`) is spent,
 * then drops the batch.
 *
 * The SDK's built-in retry (`RetryingTransport`) is hardcoded to 5 attempts within ~13s, which
 * is far short of the ~2 minutes of collector unavailability Kibana serverless must tolerate.
 * That inner retry still runs within each attempt made by this layer; this layer only decides
 * whether to schedule another attempt after the inner one gives up.
 *
 * Note for callers: the batch processor abandons an export after its `exportTimeoutMillis`,
 * so it must be configured to exceed `maxElapsedTimeMs` for the budget to be honored.
 *
 * Retry timers are unref'd and cancelled on `shutdown()`, so a pending retry never keeps the
 * process alive. `forceFlush()` fast-forwards pending backoff waits into immediate attempts so
 * a flush is not held hostage by a backoff timer.
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

        // `pending` is created before the timer so the timer callback can never observe it
        // uninitialized; its own closures only run after this block completes.
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
