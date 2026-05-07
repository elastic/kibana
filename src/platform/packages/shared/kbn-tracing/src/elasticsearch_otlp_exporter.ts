/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { core } from '@elastic/opentelemetry-node/sdk';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const ES_OTLP_TRACES_PATH = '/_otlp/v1/traces';
const CONTENT_TYPE_PROTOBUF = 'application/x-protobuf';

/**
 * A {@link tracing.SpanExporter} that ships OTLP-protobuf encoded spans
 * to Elasticsearch's native `/_otlp/v1/traces` endpoint via the
 * ES client transport. This reuses the same connection, auth, and TLS
 * settings that Kibana already has for talking to Elasticsearch.
 */
export class ElasticsearchOtlpExporter implements tracing.SpanExporter {
  private readonly sendingPromises = new Set<Promise<void>>();
  private isShutdown = false;

  constructor(private readonly client: ElasticsearchClient) {}

  export(spans: tracing.ReadableSpan[], resultCallback: (result: core.ExportResult) => void): void {
    if (this.isShutdown) {
      resultCallback({
        code: core.ExportResultCode.FAILED,
        error: new Error('Exporter has been shut down'),
      });
      return;
    }

    const serialized = ProtobufTraceSerializer.serializeRequest(spans);
    if (!serialized) {
      resultCallback({
        code: core.ExportResultCode.FAILED,
        error: new Error('Serialization failed'),
      });
      return;
    }

    const exportPromise = this.client.transport
      .request(
        {
          method: 'POST',
          path: ES_OTLP_TRACES_PATH,
          body: Buffer.from(serialized),
        },
        {
          headers: { 'Content-Type': CONTENT_TYPE_PROTOBUF },
          maxRetries: 3,
        }
      )
      .then(() => resultCallback({ code: core.ExportResultCode.SUCCESS }))
      .catch((error) => resultCallback({ code: core.ExportResultCode.FAILED, error }))
      .finally(() => this.sendingPromises.delete(exportPromise));

    this.sendingPromises.add(exportPromise);
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this.sendingPromises);
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true;
    await this.forceFlush();
  }
}
