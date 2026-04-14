/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { DisposableAppender, Layout, LogLevel, LogRecord } from '@kbn/logging';
import { ROOT_CONTEXT, TraceFlags, trace, type Context } from '@opentelemetry/api';
import type { AnyValueMap } from '@opentelemetry/api-logs';
import { SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  detectResources,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import type { OtelAppenderConfig } from '@kbn/core-logging-server';
// getConfiguration returns the already-initialised APM config singleton (loaded at bootstrap).
// Both packages are platform/private so this import is within the allowed visibility boundary.
import { getConfiguration } from '@kbn/apm-config-loader';
import { Layouts } from '../../layouts/layouts';

const DISPOSE_TIMEOUT_MS = 5_000;

/**
 * Derives OTel service resource attributes from the APM configuration that was
 * already loaded at bootstrap time. This mirrors the approach used by
 * `initTelemetry` for traces so that all signals share a consistent service
 * identity without requiring the user to re-declare it in `kibana.yml`.
 */
const deriveServiceAttributes = (): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const apmConfig = getConfiguration('kibana');
  if (!apmConfig) {
    return attrs;
  }
  if (apmConfig.serviceName) {
    attrs['service.name'] = String(apmConfig.serviceName);
  }
  if (apmConfig.serviceVersion) {
    attrs['service.version'] = String(apmConfig.serviceVersion);
  }
  if (apmConfig.environment) {
    attrs['deployment.environment'] = String(apmConfig.environment);
  }
  return attrs;
};

/**
 * Maps a Kibana log level to the corresponding OTel SeverityNumber.
 * Returns `undefined` for filter-only levels ('all', 'off') that should never
 * appear on an actual log record, causing the record to be silently dropped.
 */
const toSeverityNumber = (level: LogLevel): SeverityNumber | undefined => {
  switch (level.id) {
    case 'trace':
      return SeverityNumber.TRACE;
    case 'debug':
      return SeverityNumber.DEBUG;
    case 'info':
      return SeverityNumber.INFO;
    case 'warn':
      return SeverityNumber.WARN;
    case 'error':
      return SeverityNumber.ERROR;
    case 'fatal':
      return SeverityNumber.FATAL;
    default:
      // 'all' and 'off' are filter thresholds, not record severities.
      return undefined;
  }
};

/**
 * Builds an OTel Context from a Kibana LogRecord's trace identifiers so that
 * the OTLP exporter can set the top-level `trace_id` / `span_id` fields on
 * the log record, enabling trace ↔ log correlation in OTel-native backends.
 * Returns `undefined` when the record has no trace context.
 */
const toTraceContext = (record: LogRecord): Context | undefined => {
  if (!record.traceId || !record.spanId) {
    return undefined;
  }
  return trace.setSpanContext(ROOT_CONTEXT, {
    traceId: record.traceId,
    spanId: record.spanId,
    // Kibana only propagates IDs for sampled traces.
    traceFlags: TraceFlags.SAMPLED,
    isRemote: false,
  });
};

/**
 * Builds the OTel attribute map from a Kibana LogRecord.
 *
 * Per the OTel Logs spec:
 * - `body` carries the primary log payload (see `append()` for layout variants).
 * - Process identity (pid, hostname, OS) is captured at the resource level by
 *   the resource detectors, so it is omitted here to avoid duplication.
 * - Trace correlation (`trace_id`, `span_id`) is passed via the OTel `context`
 *   on the log record, which maps to the top-level OTLP fields; it is omitted
 *   here for the same reason.
 * - When using the JSON layout, `meta` is already part of the structured body,
 *   so `log.meta` is omitted from attributes to avoid duplication.
 */
const toAttributes = (
  record: LogRecord,
  includeLogMeta: boolean
): Record<string, string | number | boolean> => {
  const attrs: Record<string, string | number | boolean> = {
    'log.logger': record.context,
  };

  if (record.transactionId) {
    // APM transaction ID — no standard OTel field exists for this.
    attrs['transaction.id'] = record.transactionId;
  }

  if (record.error) {
    // OTel semantic conventions for exceptions — backends use these for error detection.
    attrs['exception.type'] = record.error.name;
    attrs['exception.message'] = record.error.message;
    if (record.error.stack) {
      attrs['exception.stacktrace'] = record.error.stack;
    }
  }

  if (includeLogMeta && record.meta) {
    // Only included for pattern layout: with JSON layout the meta is part of
    // the structured body and repeating it here would be redundant.
    attrs['log.meta'] = JSON.stringify(record.meta);
  }

  return attrs;
};

/**
 * A Kibana log appender that ships log records to an OTLP-compatible endpoint
 * using the OpenTelemetry Logs SDK.  Records are buffered by the SDK's
 * {@link BatchLogRecordProcessor} and flushed periodically or on shutdown.
 * @internal
 */
export class OtelAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('otel'),
    url: schema.string(),
    headers: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
    /**
     * Optional layout config. Defaults to JSON (structured body).
     * Use `{ type: 'pattern' }` for a human-readable string body.
     */
    layout: schema.maybe(Layouts.configSchema),
    // Optional: user-provided attributes override the service attributes derived from APM config.
    attributes: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  });

  private readonly loggerProvider: LoggerProvider;
  private readonly logger: Logger;
  private readonly layout: Layout;
  /** True when using JSON layout: the full LogRecord is sent as `body.structured`. */
  private readonly useStructuredBody: boolean;

  constructor(config: OtelAppenderConfig) {
    const exporter = new OTLPLogExporter({ url: config.url, headers: config.headers ?? {} });
    // Layer the resource from three sources (each overriding the previous):
    //   1. Auto-detected: host, OS, process, env-var OTel attributes
    //   2. Derived: service.name / service.version / deployment.environment from the
    //      APM config singleton (mirrors how initTelemetry builds trace resources)
    //   3. User overrides: explicit attributes from kibana.yml (optional)
    const resource = detectResources({
      detectors: [envDetector, hostDetector, osDetector, processDetector],
    })
      .merge(resourceFromAttributes(deriveServiceAttributes()))
      .merge(resourceFromAttributes(config.attributes ?? {}));
    this.loggerProvider = new LoggerProvider({
      processors: [new BatchLogRecordProcessor(exporter)],
      resource,
    });
    // The scope name 'kibana' identifies this instrumentation library.
    // Individual logger contexts are passed as the 'log.logger' attribute.
    this.logger = this.loggerProvider.getLogger('kibana');

    const layoutConfig = config.layout ?? { type: 'json' as const };
    this.layout = Layouts.create(layoutConfig);
    // JSON layout → full LogRecord as AnyValueMap → indexed as body.structured.
    // Pattern layout → formatted string → indexed as body.text.
    this.useStructuredBody = layoutConfig.type !== 'pattern';
  }

  public append(record: LogRecord): void {
    const severityNumber = toSeverityNumber(record.level);
    if (severityNumber === undefined) {
      return;
    }

    this.logger.emit({
      timestamp: record.timestamp,
      severityNumber,
      severityText: record.level.id.toUpperCase(),
      // JSON layout (default): send the full LogRecord as a structured object.
      // Elastic's OTel ingest indexes this as body.structured, giving individual
      // fields (message, meta, level, etc.) proper searchability.
      //
      // Pattern layout: format the record to a human-readable string.
      // Elastic indexes this as body.text, aliased to the ECS `message` field.
      body: this.useStructuredBody
        ? (record as unknown as AnyValueMap)
        : this.layout.format(record),
      context: toTraceContext(record),
      // log.meta is omitted from attributes when using JSON layout because it
      // is already part of the structured body.
      attributes: toAttributes(record, !this.useStructuredBody),
    });
  }

  public async dispose(): Promise<void> {
    // Wrap shutdown in a timeout to prevent indefinite hangs when the remote
    // endpoint is unreachable or slow (the spike confirmed this is a real risk).
    // Attach .catch() so that a late rejection from shutdown() after the timeout
    // fires does not produce an unhandled promise rejection.
    const shutdownPromise = this.loggerProvider.shutdown().catch(() => {});
    await Promise.race([
      shutdownPromise,
      new Promise<void>((resolve) => setTimeout(resolve, DISPOSE_TIMEOUT_MS)),
    ]);
  }
}
