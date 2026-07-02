import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const readIndex: (esClient: ElasticsearchClient, index: string) => Promise<unknown>;
