import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const deleteTemplate: (esClient: ElasticsearchClient, name: string) => Promise<unknown>;
