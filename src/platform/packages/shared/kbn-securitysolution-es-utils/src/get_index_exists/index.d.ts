import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const getIndexExists: (esClient: ElasticsearchClient, index: string) => Promise<boolean>;
