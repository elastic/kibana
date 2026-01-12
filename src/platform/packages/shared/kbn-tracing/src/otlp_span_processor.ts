/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OTLPExportConfig } from '@kbn/tracing-config';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { diag } from '@opentelemetry/api';

export class OTLPSpanProcessor extends tracing.BatchSpanProcessor {
  constructor(config: OTLPExportConfig, protocol: 'grpc' | 'http') {
    diag.info(`Initializing OTLP exporter with protocol: ${protocol}, url: ${config.url}`);

    const exporter =
      protocol === 'grpc'
        ? new OTLPTraceExporterGRPC({
            url: config.url,
            headers: config.headers,
          })
        : new OTLPTraceExporterHTTP({
            url: config.url,
            headers: config.headers,
          });

    super(exporter, {
      scheduledDelayMillis: config.scheduled_delay,
    });

    diag.info('OTLP span processor initialized successfully');
  }
}
