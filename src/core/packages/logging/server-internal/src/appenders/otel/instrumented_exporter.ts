/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';

export type ExporterProtocol = 'http' | 'proto' | 'grpc';

type ExportCallback = Parameters<LogRecordExporter['export']>[1];
type ExportResult = Parameters<ExportCallback>[0];

// ExportResultCode from @opentelemetry/core: SUCCESS = 0, FAILED = 1.
// Compared against the literal so we don't take a direct dep on
// @opentelemetry/core (it is transitive via @opentelemetry/sdk-logs).
const EXPORT_RESULT_SUCCESS = 0;

const WARN_WINDOW_MS = 30_000;

const meter = metrics.getMeter('kibana.logging.otel_appender');

const recordsExported = meter.createCounter('kibana.logging.otel_appender.records.exported', {
  description:
    'Log records the OTLP exporter has finished processing, broken down by outcome (success|failure).',
  unit: '{record}',
  valueType: ValueType.INT,
});

const exportDuration = meter.createHistogram('kibana.logging.otel_appender.export.duration', {
  description: 'Wall-clock time from OTLP export batch send to the exporter result callback.',
  unit: 'ms',
  valueType: ValueType.DOUBLE,
});

/**
 * Wraps an OTLP {@link LogRecordExporter} to observe export outcomes as OTel
 * metrics and surface failures via a rate-limited `console.error`.
 *
 * The exporter's result callback fires synchronously in-process; the metrics
 * here reflect the SDK's local view of export results. They are shipped via
 * the OTel metrics pipeline, which is independent of the logs pipeline
 * (different exporter, typically a different endpoint), so partial failures
 * (logs down, metrics up) remain observable.
 *
 * `console.error` is used in preference to the Kibana logger because in
 * serverless this appender is the only one configured; routing a failure
 * notice through the logger would feed back into the failing appender.
 */
export class InstrumentedExporter implements LogRecordExporter {
  private readonly lastWarnedAtByErrorType = new Map<string, number>();

  constructor(
    private readonly underlying: LogRecordExporter,
    private readonly protocol: ExporterProtocol
  ) {}

  public export(logs: ReadableLogRecord[], resultCallback: ExportCallback): void {
    const start = performance.now();
    let settled = false;
    this.underlying.export(logs, (result: ExportResult) => {
      // Guard against an underlying exporter (or middleware) that invokes the
      // result callback more than once; that would otherwise double-count
      // every metric and re-fire the rate-limited warn.
      if (settled) return;
      settled = true;

      const durationMs = performance.now() - start;
      const isSuccess = result.code === EXPORT_RESULT_SUCCESS;
      // `error.type` is included on success too, with value 'none', so that
      // operator queries like `sum by ('error.type') (records.exported)` are
      // partition-complete (total == sum of by-clauses), instead of silently
      // dropping success rows.
      const errorType = isSuccess ? 'none' : result.error?.name ?? 'unknown';
      const attributes = {
        outcome: isSuccess ? 'success' : 'failure',
        'otel.exporter.protocol': this.protocol,
        'error.type': errorType,
      };

      recordsExported.add(logs.length, attributes);
      exportDuration.record(durationMs, attributes);

      if (!isSuccess) {
        this.warnRateLimited(errorType, logs.length);
      }

      resultCallback(result);
    });
  }

  public async shutdown(): Promise<void> {
    return this.underlying.shutdown();
  }

  private warnRateLimited(errorType: string, batchSize: number): void {
    // performance.now() rather than Date.now(): the 30-second window is
    // elapsed-time logic, and a wall-clock backward jump (NTP correction)
    // could otherwise extend the window arbitrarily.
    const now = performance.now();
    const previousWarnAt = this.lastWarnedAtByErrorType.get(errorType);
    if (previousWarnAt !== undefined && now - previousWarnAt < WARN_WINDOW_MS) {
      return;
    }
    this.lastWarnedAtByErrorType.set(errorType, now);
    // eslint-disable-next-line no-console
    console.error(
      `[OtelAppender] OTLP log export failed (errorType=${errorType}, batchSize=${batchSize}, protocol=${this.protocol})`
    );
  }
}
