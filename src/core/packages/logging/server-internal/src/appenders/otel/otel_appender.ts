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
import { Layouts } from '../../layouts/layouts';

const DISPOSE_TIMEOUT_MS = 5_000;

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
 * Builds the OTel attribute map from a Kibana LogRecord.
 * Well-known OTel semantic convention attributes are extracted here so that
 * OTel-native backends can filter and correlate without parsing the body.
 * `meta` is intentionally omitted — it is included in the formatted body.
 */
const toAttributes = (record: LogRecord): Record<string, string | number | boolean> => {
  const attrs: Record<string, string | number | boolean> = {
    'log.logger': record.context,
    'process.pid': record.pid,
  };

  if (record.traceId) {
    attrs['trace.id'] = record.traceId;
  }
  if (record.spanId) {
    attrs['span.id'] = record.spanId;
  }
  if (record.transactionId) {
    attrs['transaction.id'] = record.transactionId;
  }

  if (record.error) {
    attrs['exception.type'] = record.error.name;
    attrs['exception.message'] = record.error.message;
    if (record.error.stack) {
      attrs['exception.stacktrace'] = record.error.stack;
    }
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
    attributes: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
    layout: schema.maybe(Layouts.configSchema),
  });

  private readonly loggerProvider: LoggerProvider;
  private readonly logger: Logger;
  private readonly layout: Layout;

  constructor(config: OtelAppenderConfig) {
    this.layout = Layouts.create(config.layout ?? { type: 'json' });

    const exporter = new OTLPLogExporter({ url: config.url, headers: config.headers });
    // Merge auto-detected host/process/OS/env attributes with user-provided ones
    // so that the resource is consistent with other OTel signals (traces, metrics).
    const resource = detectResources({
      detectors: [envDetector, hostDetector, osDetector, processDetector],
    }).merge(resourceFromAttributes(config.attributes));
    this.loggerProvider = new LoggerProvider({
      processors: [new BatchLogRecordProcessor(exporter)],
      resource,
    });
    // The scope name 'kibana' identifies this instrumentation library.
    // Individual logger contexts are passed as the 'log.logger' attribute.
    this.logger = this.loggerProvider.getLogger('kibana');
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
      body: this.layout.format(record),
      attributes: toAttributes(record),
    });
  }

  public async dispose(): Promise<void> {
    // Wrap shutdown in a timeout to prevent indefinite hangs when the remote
    // endpoint is unreachable or slow (the spike confirmed this is a real risk).
    await Promise.race([
      this.loggerProvider.shutdown(),
      new Promise<void>((resolve) => setTimeout(resolve, DISPOSE_TIMEOUT_MS)),
    ]);
  }
}
