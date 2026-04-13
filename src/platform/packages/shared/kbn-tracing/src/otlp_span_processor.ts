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
import { OTLPTraceExporter as OTLPTraceExporterPROTO } from '@opentelemetry/exporter-trace-otlp-proto';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { diag } from '@opentelemetry/api';
import { Metadata } from '@grpc/grpc-js';

export class OTLPSpanProcessor extends tracing.BatchSpanProcessor {
  constructor(config: OTLPExportConfig, protocol: 'grpc' | 'http' | 'proto') {
    diag.info(`Initializing OTLP exporter with protocol: ${protocol}, url: ${config.url}`);

    let exporter: OTLPTraceExporterHTTP | OTLPTraceExporterGRPC | OTLPTraceExporterPROTO;

    switch (protocol) {
      case 'grpc':
        const metadata = new Metadata();
        Object.entries(config.headers || {}).forEach(([key, value]) => {
          metadata.add(key, value);
        });

        exporter = new OTLPTraceExporterGRPC({
          url: config.url,
          metadata,
        });
        break;
      case 'http':
        exporter = new OTLPTraceExporterHTTP({
          url: config.url,
          headers: config.headers,
        });
        break;
      case 'proto':
        exporter = new OTLPTraceExporterPROTO({
          url: config.url,
          headers: config.headers,
        });
        break;
    }

    super(exporter, {
      scheduledDelayMillis: config.scheduled_delay,
    });

    diag.info('OTLP span processor initialized successfully');
  }
}
