import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export declare const isInlineScriptingEnabled: ({ client, maxRetries, maxRetryDelay, }: {
    client: ElasticsearchClient;
    maxRetries?: number;
    maxRetryDelay?: number;
}) => Promise<boolean>;
