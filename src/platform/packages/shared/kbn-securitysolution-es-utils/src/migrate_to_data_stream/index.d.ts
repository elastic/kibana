import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * migrate to data stream
 * @param esClient
 * @param name
 */
export declare const migrateToDataStream: (esClient: ElasticsearchClient, name: string) => Promise<unknown>;
