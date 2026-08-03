import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const setPolicy: (esClient: ElasticsearchClient, name: string, body: Record<string, unknown>) => Promise<unknown>;
