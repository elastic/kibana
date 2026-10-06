/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import type { core } from '@elastic/opentelemetry-node/sdk';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
/**
 * A {@link tracing.SpanExporter} that ships OTLP-protobuf encoded spans
 * to Elasticsearch's native `/_otlp/v1/traces` endpoint via the
 * ES client transport. This reuses the same connection, auth, and TLS
 * settings that Kibana already has for talking to Elasticsearch.
 */
export declare class ElasticsearchOtlpExporter implements tracing.SpanExporter {
  private readonly client;
  private readonly sendingPromises;
  private isShutdown;
  constructor(client: ElasticsearchClient);
  export(spans: tracing.ReadableSpan[], resultCallback: (result: core.ExportResult) => void): void;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
