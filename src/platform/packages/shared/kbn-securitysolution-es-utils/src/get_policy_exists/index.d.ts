import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const getPolicyExists: (esClient: ElasticsearchClient, name: string) => Promise<boolean>;
