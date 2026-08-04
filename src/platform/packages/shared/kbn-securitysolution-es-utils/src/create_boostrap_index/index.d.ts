import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const createBootstrapIndex: (esClient: ElasticsearchClient, index: string) => Promise<unknown>;
