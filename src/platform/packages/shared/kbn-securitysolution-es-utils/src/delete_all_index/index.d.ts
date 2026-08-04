import type { ElasticsearchClient } from '../elasticsearch_client';
export declare const deleteAllIndex: (esClient: ElasticsearchClient, pattern: string, specifyAlias?: boolean, maxAttempts?: number) => Promise<boolean>;
