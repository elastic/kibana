import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const deletePolicy: (esClient: ElasticsearchClient, name: string) => Promise<unknown>;
