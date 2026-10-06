import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { core } from '@elastic/opentelemetry-node/sdk';
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
