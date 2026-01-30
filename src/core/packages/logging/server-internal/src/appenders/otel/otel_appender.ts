/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import type { LogRecord, DisposableAppender, LogLevel } from '@kbn/logging';
import { type Logger, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { OtelAppenderConfig } from '@kbn/core-logging-server';

function toSeverityNumber(level: LogLevel): SeverityNumber | undefined {
  switch (level.id) {
    case 'all':
      return SeverityNumber.UNSPECIFIED;
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
  }
}

export class OtelAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('otel'),
    url: schema.string(),
    headers: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
    attributes: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
  });

  private logger: Logger;
  private loggerProvider: LoggerProvider;

  constructor(config: OtelAppenderConfig) {
    const logExporter = new OTLPLogExporter({
      url: config.url,
      headers: config.headers,
    });
    this.loggerProvider = new LoggerProvider({
      processors: [new BatchLogRecordProcessor(logExporter)],
      resource: resourceFromAttributes(config.attributes),
    });
    this.logger = this.loggerProvider.getLogger('default');
  }

  public append(record: LogRecord) {
    const severityNumber = toSeverityNumber(record.level);
    if (!severityNumber) {
      return;
    }
    this.logger.emit({
      timestamp: record.timestamp,
      body: record.message,
      severityNumber,
      attributes: omit(record, ['error', 'timestamp', 'level', 'message', 'meta']),
    });
  }

  public async dispose() {
    await this.loggerProvider.shutdown();
  }
}
