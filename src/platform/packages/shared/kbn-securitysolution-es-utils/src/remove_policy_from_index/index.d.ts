import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const removePolicyFromIndex: (esClient: ElasticsearchClient, index: string) => Promise<unknown>;
