import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const readPrivileges: (esClient: ElasticsearchClient, index: string) => Promise<unknown>;
