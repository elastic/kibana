/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchOTLPExportConfig } from '@kbn/tracing-config';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { tracing } from '@elastic/opentelemetry-node/sdk';
import { diag } from '@opentelemetry/api';

/**
 * Span processor that exports traces directly to Elasticsearch 9.x+ native
 * OTLP endpoint (/_otlp/v1/traces) using protobuf encoding.
 *
 * Supports basic auth (username/password) and API key authentication.
 */
export class ElasticsearchOTLPSpanProcessor extends tracing.BatchSpanProcessor {
  constructor(config: ElasticsearchOTLPExportConfig) {
    const endpoint = config.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/_otlp/v1/traces`;

    const headers: Record<string, string> = {};
    if (config.api_key) {
      headers.Authorization = `ApiKey ${config.api_key}`;
    } else if (config.username && config.password) {
      headers.Authorization = `Basic ${Buffer.from(
        `${config.username}:${config.password}`
      ).toString('base64')}`;
    }

    diag.info(
      `Initializing Elasticsearch OTLP exporter: ${url} (auth: ${
        config.api_key ? 'api_key' : config.username ? 'basic' : 'none'
      })`
    );

    const exporter = new OTLPTraceExporter({ url, headers });

    super(exporter, {
      scheduledDelayMillis: config.scheduled_delay ?? 1000,
    });

    diag.info('Elasticsearch OTLP span processor initialized successfully');
  }
}
