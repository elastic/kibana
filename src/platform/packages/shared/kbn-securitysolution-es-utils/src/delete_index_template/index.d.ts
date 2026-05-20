import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const deleteIndexTemplate: (esClient: ElasticsearchClient, name: string) => Promise<unknown>;
