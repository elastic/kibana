/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { RetryingLogRecordExporter, isRetryableExportError } from './retrying_log_exporter';

type ExportResultCallback = Parameters<LogRecordExporter['export']>[1];
type ExportResult = Parameters<ExportResultCallback>[0];

const SUCCESS: ExportResult = { code: 0 };
const failure = (error?: Error): ExportResult => ({ code: 1, error });

const networkError = (code = 'ECONNREFUSED') => Object.assign(new Error('network'), { code });
const httpError = (code: number) => Object.assign(new Error('http'), { code });

const logs = [{} as ReadableLogRecord, {} as ReadableLogRecord];

/** A delegate whose export() synchronously reports the queued results, then SUCCESS forever. */
const makeDelegate = (...results: ExportResult[]) => {
  const queue = [...results];
  return {
    export: jest.fn((_logs: ReadableLogRecord[], callback: ExportResultCallback) => {
      callback(queue.shift() ?? SUCCESS);
    }),
    forceFlush: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  };
};

describe('isRetryableExportError', () => {
  it('returns false when there is no error', () => {
    expect(isRetryableExportError(undefined)).toBe(false);
  });

  it('classifies transient network error codes as retryable', () => {
    for (const code of ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN']) {
      expect(isRetryableExportError(networkError(code))).toBe(true);
    }
    expect(isRetryableExportError(networkError('EACCES'))).toBe(false);
  });

  it('classifies retryable HTTP statuses as retryable', () => {
    for (const code of [429, 502, 503, 504]) {
      expect(isRetryableExportError(httpError(code))).toBe(true);
    }
    expect(isRetryableExportError(httpError(400))).toBe(false);
    expect(isRetryableExportError(httpError(401))).toBe(false);
  });

  it('classifies transient gRPC statuses as retryable', () => {
    // 4 = DEADLINE_EXCEEDED, 14 = UNAVAILABLE
    for (const code of [4, 14]) {
      expect(isRetryableExportError(httpError(code))).toBe(true);
      // At runtime @grpc/grpc-js surfaces the status as a numeric string, despite its types.
      expect(isRetryableExportError(networkError(String(code)))).toBe(true);
    }
    // 8 = RESOURCE_EXHAUSTED: only retryable per OTLP spec when RetryInfo is present (not parsed here).
    expect(isRetryableExportError(httpError(8))).toBe(false);
    expect(isRetryableExportError(networkError('8'))).toBe(false);
    // 16 = UNAUTHENTICATED
    expect(isRetryableExportError(httpError(16))).toBe(false);
    expect(isRetryableExportError(networkError('16'))).toBe(false);
  });

  it('classifies the code-less transient messages from the SDK as retryable', () => {
    // Surfaced by the OTLP export delegate when the inner (SDK) retries are exhausted.
    expect(isRetryableExportError(new Error('Export failed with retryable status'))).toBe(true);
    // Surfaced by the SDK HTTP transport on request timeout.
    expect(isRetryableExportError(new Error('Request timed out'))).toBe(true);
    expect(isRetryableExportError(new Error('anything else'))).toBe(false);
  });
});

describe('RetryingLogRecordExporter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Pin jitter to its midpoint so the backoff sequence is exactly 1000, 1500, 2250, ... ms.
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('passes a successful export through without scheduling retries', () => {
    const delegate = makeDelegate(SUCCESS);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);

    expect(delegate.export).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(SUCCESS);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('fails immediately on non-retryable errors', () => {
    const nonRetryable = failure(httpError(401));
    const delegate = makeDelegate(nonRetryable);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);

    expect(delegate.export).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(nonRetryable);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('retries transient failures with backoff until success', () => {
    const delegate = makeDelegate(failure(networkError()), failure(httpError(503)), SUCCESS);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    expect(delegate.export).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    // First backoff: 1000ms.
    jest.advanceTimersByTime(999);
    expect(delegate.export).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(delegate.export).toHaveBeenCalledTimes(2);
    expect(callback).not.toHaveBeenCalled();

    // Second backoff: 1500ms.
    jest.advanceTimersByTime(1500);
    expect(delegate.export).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(SUCCESS);
  });

  it('always passes the same batch of records to the delegate', () => {
    const delegate = makeDelegate(failure(networkError()), SUCCESS);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);

    exporter.export(logs, jest.fn());
    jest.advanceTimersByTime(1000);

    expect(delegate.export).toHaveBeenCalledTimes(2);
    expect(delegate.export.mock.calls[0][0]).toBe(logs);
    expect(delegate.export.mock.calls[1][0]).toBe(logs);
  });

  it('caps the backoff at 10s', () => {
    const delegate = makeDelegate(...Array(20).fill(failure(networkError())));
    const exporter = new RetryingLogRecordExporter(delegate, 600_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    // After the 6th retry the backoff (1000 * 1.5^n) exceeds 10s and is capped: one attempt per 10s step.
    jest.advanceTimersByTime(60_000);
    const attemptsSoFar = delegate.export.mock.calls.length;
    jest.advanceTimersByTime(10_000);
    expect(delegate.export).toHaveBeenCalledTimes(attemptsSoFar + 1);
    jest.advanceTimersByTime(10_000);
    expect(delegate.export).toHaveBeenCalledTimes(attemptsSoFar + 2);
  });

  it('drops the batch once the retry budget is exhausted', () => {
    const lastFailure = failure(httpError(503));
    const delegate = makeDelegate(failure(networkError()), failure(networkError()), lastFailure);
    // 3s budget: attempts at t=0, 1000, 2500; the next backoff (2250ms) would pass the deadline.
    const exporter = new RetryingLogRecordExporter(delegate, 3_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    jest.advanceTimersByTime(10_000);

    expect(delegate.export).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(lastFailure);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reports the failure and stops retrying when shut down with a pending retry', async () => {
    const lastFailure = failure(networkError());
    const delegate = makeDelegate(lastFailure);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    expect(callback).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);

    await exporter.shutdown();

    expect(delegate.shutdown).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(lastFailure);
    expect(jest.getTimerCount()).toBe(0);

    // No further attempts after shutdown.
    jest.advanceTimersByTime(120_000);
    expect(delegate.export).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a retry when a failure arrives after shutdown', async () => {
    let capturedCallback: ExportResultCallback | undefined;
    const delegate = {
      export: jest.fn((_logs: ReadableLogRecord[], cb: ExportResultCallback) => {
        capturedCallback = cb; // in-flight: never answers synchronously
      }),
      forceFlush: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    await exporter.shutdown();

    const inFlightFailure = failure(networkError());
    capturedCallback!(inFlightFailure);

    expect(callback).toHaveBeenCalledWith(inFlightFailure);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('fast-forwards pending retries on forceFlush', async () => {
    const delegate = makeDelegate(failure(networkError()), SUCCESS);
    const exporter = new RetryingLogRecordExporter(delegate, 120_000);
    const callback = jest.fn();

    exporter.export(logs, callback);
    expect(delegate.export).toHaveBeenCalledTimes(1);

    // Without advancing the clock, flushing runs the pending retry immediately.
    await exporter.forceFlush();

    expect(delegate.export).toHaveBeenCalledTimes(2);
    expect(delegate.forceFlush).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(SUCCESS);
    expect(jest.getTimerCount()).toBe(0);
  });
});
